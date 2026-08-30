"""Refunds & credit issuance for cancelled-after-booking flows.

Refunds route through `services.razorpay_service.create_refund`, which
respects PAYMENT_MODE. API failures are caught here — a webhook that
initiates a refund must NEVER crash because the gateway hiccupped.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from config import PRIORITY_PASS_TTL_DAYS
from database import priority_passes, transactions
from services.razorpay_service import create_refund

logger = logging.getLogger(__name__)


async def initiate_refund(transaction_id: str, amount: int) -> str:
    """Kick off a refund for the given transaction.

    Returns the refund id on success. On API failure, records a retryable
    state (`refundStatus="initiated"`, `refundError=<msg>`) and returns a
    sentinel string so the webhook can still respond. Amount is stored in
    rupees on the transaction but Razorpay wants paise.
    """
    txn = await transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not txn:
        raise ValueError(f"transaction {transaction_id} not found for refund")

    payment_id = txn.get("razorpayPaymentId") or ""
    amount_paise = int(amount) * 100

    try:
        refund = await create_refund(payment_id, amount_paise)
        refund_id = refund.get("id") or f"rfnd_unknown_{uuid.uuid4().hex[:10]}"
        await transactions.update_one(
            {"id": transaction_id},
            {"$set": {
                "refundStatus": "initiated",
                "refundId": refund_id,
                "refundAmount": amount,
                "refundError": None,
            }},
        )
        logger.info(
            "Refund initiated txn=%s payment=%s amount=%s refund=%s",
            transaction_id, payment_id, amount, refund_id,
        )
        return refund_id
    except Exception as exc:  # noqa: BLE001
        # Never crash the webhook — mark retryable and move on.
        logger.exception("Refund API failure for txn=%s payment=%s", transaction_id, payment_id)
        await transactions.update_one(
            {"id": transaction_id},
            {"$set": {
                "refundStatus": "initiated",  # still initiated from avsar's perspective
                "refundError": str(exc),
            }},
        )
        return "refund_pending_retry"


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
