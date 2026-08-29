"""Refunds & credit issuance for cancelled-after-booking flows."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from config import PRIORITY_PASS_TTL_DAYS
from database import priority_passes, transactions

logger = logging.getLogger(__name__)


# MOCK: replace with Razorpay Refunds API.
async def initiate_refund(transaction_id: str, amount: int) -> str:
    """Mark a transaction's refund as initiated. Returns a mock refund id."""
    refund_id = f"mock_rfnd_{uuid.uuid4().hex[:12]}"
    await transactions.update_one(
        {"id": transaction_id},
        {"$set": {"refundStatus": "initiated", "refundId": refund_id, "refundAmount": amount}},
    )
    logger.info("MOCK refund initiated for txn=%s amount=%s", transaction_id, amount)
    return refund_id


async def issue_priority_pass(
    *, patient_id: str, clinic_id: str, amount: int, source_transaction_id: str
) -> dict:
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "patientId": patient_id,
        "clinicId": clinic_id,
        "amount": int(amount),
        "issuedAt": now.isoformat(),
        "expiresAt": (now + timedelta(days=PRIORITY_PASS_TTL_DAYS)).isoformat(),
        "redeemed": False,
        "redeemedTransactionId": None,
        "sourceTransactionId": source_transaction_id,
    }
    await priority_passes.insert_one(doc)
    doc.pop("_id", None)
    logger.info(
        "PriorityPass issued for patient=%s clinic=%s amount=%s", patient_id, clinic_id, amount
    )
    return doc
