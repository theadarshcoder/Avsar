"""Patient checkout routes.

* GET /checkout/{token}            — view slot + price + patient identity
* POST /checkout/{token}/order     — create a REAL Razorpay order (razorpay mode)
* GET /checkout/{token}/outcome    — poll for webhook resolution
* POST /checkout/{token}/mock-pay  — mock-mode-only helper for acceptance tests
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from database import checkout_tokens, clinics, patients, slots, transactions
from models.slot import SlotStatus
from services.pricing_service import compute_price
from services.razorpay_service import (
    MOCK_OVERRIDE_TOKEN,
    PAYMENT_MODE,
    RAZORPAY_KEY_ID,
    create_order,
    is_mock_mode,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/checkout", tags=["checkout"])


class MockPayRequest(BaseModel):
    forceEventId: Optional[str] = None
    fireWebhook: bool = True
    simulateFailure: bool = False


@router.get("/{token}")
async def get_checkout(token: str):
    tok = await checkout_tokens.find_one({"token": token}, {"_id": 0})
    if not tok:
        raise HTTPException(404, "Checkout link not found or expired")

    slot = await slots.find_one({"id": tok["slotId"]}, {"_id": 0})
    if not slot:
        raise HTTPException(404, "Slot no longer exists")

    patient = await patients.find_one({"id": tok["patientId"]}, {"_id": 0})
    clinic = await clinics.find_one({"id": tok["clinicId"]}, {"_id": 0})

    start_dt = slot["startTime"]
    if isinstance(start_dt, str):
        start_dt_parsed = datetime.fromisoformat(start_dt.replace("Z", "+00:00"))
    else:
        start_dt_parsed = start_dt
    now = datetime.now(timezone.utc)
    is_expired = start_dt_parsed <= now
    is_taken = slot["status"] in (
        SlotStatus.LOCKED.value,
        SlotStatus.BOOKED.value,
        SlotStatus.CANCELLED_BY_CLINIC.value,
    )

    available = slot["status"] == SlotStatus.OPEN.value and not is_expired

    breakdown = await compute_price(
        standard_price=int(slot["standardPrice"]),
        standby_adjustment=int(clinic["standbyAdjustment"]),
        patient_id=patient["id"],
        clinic_id=clinic["id"],
    )

    state = "available"
    if is_expired:
        state = "expired"
    elif is_taken:
        state = "taken"

    return {
        "token": token,
        "state": state,
        "available": available,
        "paymentMode": PAYMENT_MODE,
        "slot": {
            "id": slot["id"],
            "doctorName": slot["doctorName"],
            "startTime": start_dt if isinstance(start_dt, str) else start_dt.isoformat(),
            "status": slot["status"],
            "standardPrice": int(slot["standardPrice"]),
        },
        "clinic": {
            "id": clinic["id"],
            "name": clinic["name"],
            "standbyAdjustment": int(clinic["standbyAdjustment"]),
        },
        "patient": {"id": patient["id"], "name": patient["name"], "phone": patient["phone"]},
        "priceBreakdown": breakdown.to_dict(),
    }


@router.post("/{token}/order")
async def create_checkout_order(token: str):
    """Create a REAL Razorpay order (or a mock order in mock mode).

    Order notes carry slotId / patientId / checkoutToken so the webhook
    can correlate the payment back to doctro entities WITHOUT trusting
    the client success handler.
    """
    tok = await checkout_tokens.find_one({"token": token}, {"_id": 0})
    if not tok:
        raise HTTPException(404, "Checkout link not found")

    slot = await slots.find_one({"id": tok["slotId"]}, {"_id": 0})
    if not slot:
        raise HTTPException(404, "Slot no longer exists")
    if slot["status"] != SlotStatus.OPEN.value:
        raise HTTPException(409, {"code": "SLOT_NOT_OPEN", "message": "Slot is not open."})
    start_dt = slot["startTime"]
    if isinstance(start_dt, str):
        start_dt_parsed = datetime.fromisoformat(start_dt.replace("Z", "+00:00"))
    else:
        start_dt_parsed = start_dt
    if start_dt_parsed <= datetime.now(timezone.utc):
        raise HTTPException(410, {"code": "SLOT_EXPIRED", "message": "Slot has passed."})

    clinic = await clinics.find_one({"id": tok["clinicId"]}, {"_id": 0})
    patient = await patients.find_one({"id": tok["patientId"]}, {"_id": 0})
    breakdown = await compute_price(
        standard_price=int(slot["standardPrice"]),
        standby_adjustment=int(clinic["standbyAdjustment"]),
        patient_id=patient["id"],
        clinic_id=clinic["id"],
    )

    if int(breakdown.total) <= 0:
        # Real Razorpay orders require amount >= 100 paise. This is the
        # priority-pass-covers-everything edge case flagged by the tester.
        raise HTTPException(
            400,
            {
                "code": "ZERO_TOTAL",
                "message": (
                    "This slot is fully covered by a priority pass. "
                    "Zero-amount checkout is not supported in this build."
                ),
            },
        )

    amount_paise = int(breakdown.total) * 100
    order = await create_order(
        amount_paise=amount_paise,
        notes={
            "slotId": tok["slotId"],
            "patientId": tok["patientId"],
            "clinicId": tok["clinicId"],
            "checkoutToken": token,
        },
        receipt=f"doctro_{token[:24]}",
    )

    # Link the order back to the token so the poll endpoint can find the txn.
    await checkout_tokens.update_one(
        {"token": token},
        {"$set": {"razorpayOrderId": order["id"], "orderAmountPaise": amount_paise}},
    )

    return {
        "orderId": order["id"],
        "amount": amount_paise,             # paise
        "amountRupees": int(breakdown.total),
        "currency": order.get("currency", "INR"),
        "keyId": RAZORPAY_KEY_ID,
        "paymentMode": PAYMENT_MODE,
        "prefill": {
            "name": patient["name"],
            "contact": patient["phone"],
        },
        "notes": {
            "slotId": tok["slotId"],
            "patientId": tok["patientId"],
            "clinicId": tok["clinicId"],
            "checkoutToken": token,
            "doctorName": slot["doctorName"],
        },
    }


@router.get("/{token}/outcome")
async def poll_checkout_outcome(token: str):
    """Poll for the webhook-resolved outcome for this token.

    Returns one of:
      pending      → no transaction yet
      booked       → BOOKED
      lost_race    → SLOT_JUST_TAKEN (refund initiated)
      expired      → SLOT_EXPIRED (refund initiated)
      failed       → payment failed (retry OK, slot still open)
    """
    tok = await checkout_tokens.find_one({"token": token}, {"_id": 0})
    if not tok:
        raise HTTPException(404, "Checkout link not found")

    order_id = tok.get("razorpayOrderId")

    # Prefer order-scoped lookup (accurate even if two tokens exist for same slot).
    txn = None
    if order_id:
        txn = await transactions.find_one({"razorpayOrderId": order_id}, {"_id": 0})
    # Fallback: any transaction linked to this (slot, patient) after order creation.
    if txn is None:
        txn = await transactions.find_one(
            {"slotId": tok["slotId"], "patientId": tok["patientId"]},
            {"_id": 0},
            sort=[("createdAt", -1)],
        )

    if txn is None:
        return {"state": "pending", "orderId": order_id}

    lo = txn.get("lockOutcome", "")
    mapping = {
        "won": ("booked", "BOOKED"),
        "lost_race": ("lost_race", "SLOT_JUST_TAKEN"),
        "expired": ("expired", "SLOT_EXPIRED"),
    }
    state, code = mapping.get(lo, (lo or "pending", None))
    return {
        "state": state,
        "code": code,
        "orderId": order_id,
        "transactionId": txn["id"],
        "amount": int(txn.get("totalPaid", 0)),
        "refundStatus": txn.get("refundStatus"),
    }


# ── mock-only endpoint (gated by PAYMENT_MODE + override header) ────────
@router.post("/{token}/mock-pay")
async def mock_pay(
    token: str,
    payload: MockPayRequest,
    x_doctro_test_override: Optional[str] = Header(default=None, alias="X-Doctro-Test-Override"),
):
    """Kept ONLY for automated acceptance tests that need to simulate races
    and failure paths (real card entry can't be automated reliably).

    Behavior:
      * PAYMENT_MODE=mock            → always allowed.
      * PAYMENT_MODE=razorpay AND override header/env token matches → allowed.
      * Otherwise                    → 403 (spec: mock refused in razorpay mode).
    """
    env_override = os.environ.get("MOCK_OVERRIDE_TOKEN", "") or MOCK_OVERRIDE_TOKEN
    header_ok = bool(env_override) and (x_doctro_test_override == env_override)
    if not is_mock_mode() and not header_ok:
        raise HTTPException(
            403,
            {
                "code": "MOCK_DISABLED",
                "message": (
                    f"PAYMENT_MODE={PAYMENT_MODE}: mock-pay is disabled. "
                    "Set PAYMENT_MODE=mock or send the X-Doctro-Test-Override header."
                ),
            },
        )

    tok = await checkout_tokens.find_one({"token": token}, {"_id": 0})
    if not tok:
        raise HTTPException(404, "Checkout link not found")

    slot = await slots.find_one({"id": tok["slotId"]}, {"_id": 0})
    if not slot:
        raise HTTPException(404, "Slot missing")
    clinic = await clinics.find_one({"id": tok["clinicId"]}, {"_id": 0})

    breakdown = await compute_price(
        standard_price=int(slot["standardPrice"]),
        standby_adjustment=int(clinic["standbyAdjustment"]),
        patient_id=tok["patientId"],
        clinic_id=tok["clinicId"],
    )

    order_id = f"mock_order_{uuid.uuid4().hex[:12]}"
    payment_id = f"mock_pay_{uuid.uuid4().hex[:12]}"
    event_id = payload.forceEventId or f"evt_{uuid.uuid4().hex}"

    # Persist order id on the token so the poll endpoint works in mock mode too.
    await checkout_tokens.update_one(
        {"token": token},
        {"$set": {"razorpayOrderId": order_id, "orderAmountPaise": int(breakdown.total) * 100}},
    )

    result = {
        "orderId": order_id,
        "amount": int(breakdown.total),
        "razorpayEventId": event_id,
        "webhookResponse": None,
    }
    if not payload.fireWebhook:
        return result

    from routes.webhooks.razorpay import process_webhook_event

    outcome = await process_webhook_event(
        {
            "event": "payment.failed" if payload.simulateFailure else "payment.captured",
            "id": event_id,
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "order_id": order_id,
                        "amount": breakdown.total * 100,
                        "status": "failed" if payload.simulateFailure else "captured",
                        "notes": {
                            "slotId": tok["slotId"],
                            "patientId": tok["patientId"],
                            "clinicId": tok["clinicId"],
                            "checkoutToken": token,
                        },
                    }
                }
            },
        },
        event_id=event_id,
    )
    result["webhookResponse"] = outcome
    return result
