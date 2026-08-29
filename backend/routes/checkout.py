"""Patient-facing checkout: view slot+price by token, initiate a (mocked)
payment order that fires the webhook. The webhook itself lives in
routes/webhooks/razorpay.py.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from database import checkout_tokens, clinics, patients, slots
from models.slot import SlotStatus
from services.pricing_service import compute_price

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/checkout", tags=["checkout"])


class MockOrderRequest(BaseModel):
    # Allow overriding to force a specific eventId (for concurrency tests).
    forceEventId: Optional[str] = None
    # If True the mock also POSTs to the webhook internally after order creation.
    fireWebhook: bool = True
    # If True, simulate a payment failure via the webhook.
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

    # Expired-slot state (offer-side): startTime passed & still open.
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


# MOCK: replace with Razorpay Orders API — needs test keys.
@router.post("/{token}/mock-pay")
async def mock_pay(token: str, payload: MockOrderRequest, request: Request):
    """Create a mock order & (optionally) fire the webhook synchronously.

    Returns the full webhook response so tests can assert on it.
    """
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

    result = {
        "orderId": order_id,
        "amount": breakdown.total,
        "razorpayEventId": event_id,
        "webhookResponse": None,
    }

    if not payload.fireWebhook:
        return result

    # Fire the webhook internally (calls the handler directly).
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
                        "amount": breakdown.total * 100,  # paise, like real razorpay
                        "status": "failed" if payload.simulateFailure else "captured",
                    }
                }
            },
            "checkoutToken": token,  # doctro-specific piece for locating the buyer
        }
    )
    result["webhookResponse"] = outcome
    return result
