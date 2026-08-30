"""Atomic slot-locking + confirmation.

This module contains THE core primitive of avsar: a single atomic
find_one_and_update that both checks the slot is still open AND flips it
to locked in one operation. There is intentionally no read-then-write path.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from database import priority_passes, slots, transactions
from models.slot import SlotStatus

logger = logging.getLogger(__name__)


async def atomic_lock_slot(slot_id: str, patient_id: str) -> Optional[dict]:
    """Attempt to atomically move the slot from OPEN -> LOCKED for this patient.

    Returns the updated slot document on success, or None if the slot was
    not open (already locked/booked/cancelled) OR its start time has passed.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    result = await slots.find_one_and_update(
        {
            "id": slot_id,
            "status": SlotStatus.OPEN.value,
            "startTime": {"$gt": now_iso},
        },
        {
            "$set": {
                "status": SlotStatus.LOCKED.value,
                "lockedAt": now_iso,
                "bookedByPatientId": patient_id,
            }
        },
        return_document=True,  # pymongo ReturnDocument.AFTER equivalent for motor
    )
    return result


async def mark_slot_booked(slot_id: str) -> None:
    await slots.update_one(
        {"id": slot_id}, {"$set": {"status": SlotStatus.BOOKED.value}}
    )


async def redeem_priority_pass(pass_id: str, transaction_id: str) -> None:
    await priority_passes.update_one(
        {"id": pass_id, "redeemed": False},
        {"$set": {"redeemed": True, "redeemedTransactionId": transaction_id}},
    )


async def record_transaction(
    *,
    slot_id: str,
    patient_id: str,
    clinic_id: str,
    price_breakdown: dict,
    razorpay_payment_id: str,
    razorpay_order_id: Optional[str],
    razorpay_event_id: str,
    lock_outcome: str,
    refund_status: Optional[str] = None,
) -> dict:
    """Insert a transaction record. Relies on the unique index on razorpayEventId
    for idempotency — a concurrent duplicate will raise DuplicateKeyError which
    the caller handles.
    """
    doc = {
        "id": str(uuid.uuid4()),
        "slotId": slot_id,
        "patientId": patient_id,
        "clinicId": clinic_id,
        "standardPrice": int(price_breakdown["standardPrice"]),
        "standbyAdjustment": int(price_breakdown["standbyAdjustment"]),
        "handlingFee": int(price_breakdown["handlingFee"]),
        "priorityPassAmount": int(price_breakdown.get("priorityPassAmount", 0)),
        "priorityPassId": price_breakdown.get("priorityPassId"),
        "totalPaid": int(price_breakdown["total"]),
        "razorpayPaymentId": razorpay_payment_id,
        "razorpayOrderId": razorpay_order_id,
        "razorpayEventId": razorpay_event_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "refundStatus": refund_status,
        "lockOutcome": lock_outcome,
    }
    await transactions.insert_one(doc)
    return doc
