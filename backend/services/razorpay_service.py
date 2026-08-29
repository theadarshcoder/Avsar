"""Razorpay SDK wrapper.

* `PAYMENT_MODE` selects between `razorpay` (real test-mode API) and
  `mock` (local-only stubs). Automated tests keep working in `mock`.
* The SDK is synchronous — every call is wrapped with `asyncio.to_thread`
  so it never blocks the FastAPI event loop.
* Signature verification uses the SDK's `utility.verify_webhook_signature`.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

import razorpay
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger(__name__)


PAYMENT_MODE: str = os.environ.get("PAYMENT_MODE", "razorpay").lower()
RAZORPAY_KEY_ID: str = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET: str = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET: str = os.environ.get(
    "RAZORPAY_WEBHOOK_SECRET", ""
)
MOCK_OVERRIDE_TOKEN: str = os.environ.get("MOCK_OVERRIDE_TOKEN", "")


def is_mock_mode() -> bool:
    return PAYMENT_MODE == "mock"


def _client() -> razorpay.Client:
    if not (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET):
        raise RuntimeError(
            "Razorpay credentials missing — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        )
    c = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    return c


# ── orders ──────────────────────────────────────────────────────────────
async def create_order(
    *,
    amount_paise: int,
    notes: dict,
    receipt: str,
    currency: str = "INR",
) -> dict:
    """Create a Razorpay order. In mock mode, returns a deterministic
    fake order so local tests don't hit the network."""
    if is_mock_mode():
        return {
            "id": f"order_MOCK_{uuid.uuid4().hex[:14]}",
            "amount": amount_paise,
            "currency": currency,
            "notes": notes,
            "receipt": receipt,
            "status": "created",
            "mock": True,
        }

    def _make():
        return _client().order.create(
            data={
                "amount": amount_paise,
                "currency": currency,
                "receipt": receipt[:40],
                "notes": notes,
                "payment_capture": 1,
            }
        )

    order = await asyncio.to_thread(_make)
    logger.info("Razorpay order created id=%s amount=%s", order.get("id"), order.get("amount"))
    return order


# ── refunds ─────────────────────────────────────────────────────────────
async def create_refund(payment_id: str, amount_paise: int) -> dict:
    """Refund a captured payment.

    Called for both the lost-race auto-refund and the patient's refund
    choice on a clinic-cancelled booking. Returns the Razorpay refund
    resource; raises on API failure so the caller can record retryable
    state without crashing the webhook.
    """
    if is_mock_mode() or payment_id.startswith("mock_pay_") or payment_id.startswith("pay_test"):
        return {
            "id": f"rfnd_MOCK_{uuid.uuid4().hex[:14]}",
            "payment_id": payment_id,
            "amount": amount_paise,
            "status": "processed",
            "mock": True,
        }

    def _make():
        # Razorpay SDK: client.payment.refund(payment_id, {"amount": ...})
        return _client().payment.refund(payment_id, {"amount": amount_paise})

    refund = await asyncio.to_thread(_make)
    logger.info(
        "Razorpay refund created id=%s payment=%s amount=%s",
        refund.get("id"), payment_id, amount_paise,
    )
    return refund


# ── payment & webhook signatures ────────────────────────────────────────
def verify_payment_signature(params: dict) -> bool:
    """Return True on match; False on any failure. Verifies client checkout
    callback signature (razorpay_order_id, razorpay_payment_id, razorpay_signature).
    """
    if is_mock_mode():
        return True
    try:
        _client().utility.verify_payment_signature(params)
        return True
    except Exception as exc:
        logger.warning("Razorpay payment signature verification failed: %s", exc)
        return False


def verify_webhook_signature(body: bytes | str, signature: Optional[str]) -> bool:
    """Verify Razorpay webhook signature (HMAC-SHA256)."""
    if not signature or not RAZORPAY_WEBHOOK_SECRET:
        return False
    if is_mock_mode():
        return True
    try:
        payload_str = body.decode("utf-8") if isinstance(body, bytes) else str(body)
        _client().utility.verify_webhook_signature(
            payload_str,
            signature,
            RAZORPAY_WEBHOOK_SECRET,
        )
        return True
    except Exception as exc:
        logger.warning("Razorpay webhook signature verification failed: %s", exc)
        return False

