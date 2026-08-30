"""Razorpay webhook: the sole authority for locking a slot.

* Signature verification uses the Razorpay SDK utility (HMAC-SHA256).
* Event id is read from the `X-Razorpay-Event-Id` header (real Razorpay
  posts it as a header; the internal mock path also passes it via the
  header/body for consistency).
* `slotId`, `patientId`, and `checkoutToken` are correlated back to the
  order via `payment.notes` — we NEVER trust anything client-side.
* Idempotency-first → atomic lock → refund on lost-race / expired.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pymongo.errors import DuplicateKeyError

from database import checkout_tokens, clinics, patients, slots, transactions
from models.slot import SlotStatus
from services.ledger_service import initiate_refund
from services.notification_service import (
    render_confirmation_body,
    send_whatsapp_message,
)
from services.pricing_service import compute_price
from services.razorpay_service import verify_webhook_signature
from services.slot_lock_service import (
    atomic_lock_slot,
    mark_slot_booked,
    record_transaction,
    redeem_priority_pass,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks/razorpay", tags=["webhooks"])


def _format_time(dt) -> str:
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
    return dt.strftime("%-I:%M %p")


async def process_webhook_event(event: dict, *, event_id: Optional[str] = None) -> dict:
    """Handle a Razorpay webhook event. Called from both the HTTP route
    (real payloads + header event id) and the internal mock-pay endpoint.
    """
    event_type: str = event.get("event") or ""
    entity = event.get("payload", {}).get("payment", {}).get("entity", {}) or {}
    payment_id: str = entity.get("id") or ""
    order_id: Optional[str] = entity.get("order_id")
    payment_status: str = entity.get("status", "")
    notes = entity.get("notes") or {}

    # Event id resolution: HTTP header (real) > body.id (mock convenience).
    resolved_event_id = event_id or event.get("id") or ""
    if not resolved_event_id:
        raise HTTPException(400, "Missing X-Razorpay-Event-Id")

    # checkoutToken correlation: order notes (real) or event.checkoutToken (mock).
    checkout_token_str: Optional[str] = (
        notes.get("checkoutToken")
        or notes.get("checkout_token")
        or event.get("checkoutToken")
    )
    if not checkout_token_str:
        raise HTTPException(400, "Missing checkoutToken in order notes")

    tok = await checkout_tokens.find_one({"token": checkout_token_str}, {"_id": 0})
    if not tok:
        raise HTTPException(404, "Unknown checkout token")

    # -------- 1. IDEMPOTENCY --------
    existing = await transactions.find_one({"razorpayEventId": resolved_event_id}, {"_id": 0})
    if existing:
        return {
            "status": "duplicate",
            "code": "DUPLICATE_EVENT",
            "message": "Event already processed",
            "transactionId": existing["id"],
            "lockOutcome": existing.get("lockOutcome"),
        }

    # -------- Failed / timed-out payment --------
    if event_type == "payment.failed" or payment_status == "failed":
        return {
            "status": "payment_failed",
            "code": "PAYMENT_FAILED",
            "message": "Payment did not complete. Retry is possible; slot remains open.",
            "slotId": tok["slotId"],
        }

    slot = await slots.find_one({"id": tok["slotId"]}, {"_id": 0})
    if not slot:
        raise HTTPException(404, "Slot no longer exists")
    clinic = await clinics.find_one({"id": tok["clinicId"]}, {"_id": 0})
    patient = await patients.find_one({"id": tok["patientId"]}, {"_id": 0})

    breakdown = await compute_price(
        standard_price=int(slot["standardPrice"]),
        standby_adjustment=int(clinic["standbyAdjustment"]),
        patient_id=patient["id"],
        clinic_id=clinic["id"],
    )

    # -------- 2. ATOMIC LOCK --------
    locked = await atomic_lock_slot(tok["slotId"], patient["id"])

    if locked is None:
        # Distinguish expired vs lost-race for the response body.
        now = datetime.now(timezone.utc)
        start_dt = slot["startTime"]
        if isinstance(start_dt, str):
            start_dt = datetime.fromisoformat(start_dt.replace("Z", "+00:00"))
        is_expired = start_dt <= now
        outcome_code = "SLOT_EXPIRED" if is_expired else "SLOT_JUST_TAKEN"
        lock_outcome = "expired" if is_expired else "lost_race"

        try:
            losing = await record_transaction(
                slot_id=tok["slotId"],
                patient_id=patient["id"],
                clinic_id=clinic["id"],
                price_breakdown=breakdown.to_dict(),
                razorpay_payment_id=payment_id,
                razorpay_order_id=order_id,
                razorpay_event_id=resolved_event_id,
                lock_outcome=lock_outcome,
                refund_status="initiated",
            )
        except DuplicateKeyError:
            existing = await transactions.find_one({"razorpayEventId": resolved_event_id}, {"_id": 0})
            return {
                "status": "duplicate",
                "code": "DUPLICATE_EVENT",
                "message": "Event already processed",
                "transactionId": existing["id"] if existing else None,
            }

        await initiate_refund(losing["id"], int(breakdown.total))
        return {
            "status": "refund_initiated",
            "code": outcome_code,
            "message": (
                "This slot was just taken — a refund has been initiated."
                if outcome_code == "SLOT_JUST_TAKEN"
                else "This slot has expired — a refund has been initiated."
            ),
            "transactionId": losing["id"],
            "amount": int(breakdown.total),
        }

    # -------- 3. LOCK WON --------
    try:
        winning = await record_transaction(
            slot_id=tok["slotId"],
            patient_id=patient["id"],
            clinic_id=clinic["id"],
            price_breakdown=breakdown.to_dict(),
            razorpay_payment_id=payment_id,
            razorpay_order_id=order_id,
            razorpay_event_id=resolved_event_id,
            lock_outcome="won",
        )
    except DuplicateKeyError:
        await slots.update_one(
            {"id": tok["slotId"], "status": SlotStatus.LOCKED.value, "bookedByPatientId": patient["id"]},
            {"$set": {"status": SlotStatus.OPEN.value, "lockedAt": None, "bookedByPatientId": None}},
        )
        existing = await transactions.find_one({"razorpayEventId": resolved_event_id}, {"_id": 0})
        return {
            "status": "duplicate",
            "code": "DUPLICATE_EVENT",
            "message": "Event already processed",
            "transactionId": existing["id"] if existing else None,
        }

    if breakdown.priorityPassId:
        await redeem_priority_pass(breakdown.priorityPassId, winning["id"])

    await mark_slot_booked(tok["slotId"])

    confirmation_error: Optional[str] = None
    try:
        await send_whatsapp_message(
            to_phone=patient["phone"],
            body=render_confirmation_body(_format_time(slot["startTime"]), slot["doctorName"]),
            template_name="booking_confirmation",
            patient_id=patient["id"],
            clinic_id=clinic["id"],
            slot_id=slot["id"],
        )
    except Exception as exc:  # noqa: BLE001
        confirmation_error = str(exc)
        logger.warning("Confirmation send failed for txn=%s: %s", winning["id"], exc)
        await slots.update_one(
            {"id": tok["slotId"]}, {"$set": {"status": SlotStatus.LOCKED.value}}
        )

    return {
        "status": "confirmed" if confirmation_error is None else "confirmation_pending",
        "code": "BOOKED",
        "transactionId": winning["id"],
        "slotId": tok["slotId"],
        "amount": int(breakdown.total),
        "priorityPassRedeemed": breakdown.priorityPassId,
        "confirmationError": confirmation_error,
    }


@router.post("")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(default=None, alias="X-Razorpay-Signature"),
    x_razorpay_event_id: Optional[str] = Header(default=None, alias="X-Razorpay-Event-Id"),
):
    raw = await request.body()
    if not verify_webhook_signature(raw, x_razorpay_signature):
        raise HTTPException(401, "Invalid signature")
    try:
        event = json.loads(raw.decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"Malformed JSON: {exc}") from exc
    return await process_webhook_event(event, event_id=x_razorpay_event_id)
