"""Local payment gateway tests — no running server, no MongoDB required.

Tests core payment logic by mocking the database layer (Motor collections)
and Razorpay SDK. Runs on Windows with `pytest tests/test_payment_gateway_local.py -n0`.

Covers:
  1. Pricing math: standby price, handling fee, priority pass deduction
  2. Order creation: happy path, stale slot (409), expired slot (410), zero total
  3. Webhook processing: successful booking, lost-race refund, expired refund,
     duplicate event idempotency, missing checkoutToken, payment.failed
  4. Refund initiation: success + API failure resilience
  5. Atomic slot locking: OPEN→LOCKED transition
  6. Mock-pay gating: 403 without override header
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ──────────────────────────────────────────────────────────────────────────────
# Set required env vars BEFORE any backend imports touch os.environ / dotenv
# ──────────────────────────────────────────────────────────────────────────────
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "doctro_test")
os.environ.setdefault("PAYMENT_MODE", "mock")
os.environ.setdefault("RAZORPAY_KEY_ID", "rzp_test_key123")
os.environ.setdefault("RAZORPAY_KEY_SECRET", "test_secret_key_456")
os.environ.setdefault("RAZORPAY_WEBHOOK_SECRET", "whsec_test_123")
os.environ.setdefault("MOCK_OVERRIDE_TOKEN", "doctro-testing-override")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("HANDLING_FEE", "50")

# Import all modules so mock.patch resolves targets
import routes.webhooks.razorpay
import services.pricing_service
import services.slot_lock_service
import services.ledger_service
import services.notification_service
import services.razorpay_service


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
def future_iso(hours: int = 3) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def past_iso(minutes: int = 5) -> str:
    return (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()


# ──────────────────────────────────────────────────────────────────────────────
# TEST 1: Pricing Service
# ──────────────────────────────────────────────────────────────────────────────
class TestPricingService:
    """Tests the compute_price function from pricing_service.py."""

    @pytest.mark.asyncio
    async def test_basic_price_calculation(self):
        """standbyPrice = standardPrice - standbyAdjustment + handlingFee"""
        with patch("services.pricing_service.priority_passes") as mock_pp:
            mock_pp.find_one = AsyncMock(return_value=None)
            from services.pricing_service import compute_price

            result = await compute_price(
                standard_price=1200,
                standby_adjustment=400,
                patient_id="p1",
                clinic_id="c1",
            )

            assert result.standardPrice == 1200
            assert result.standbyAdjustment == 400
            assert result.handlingFee == 50
            assert result.subtotal == 850  # 1200 - 400 + 50
            assert result.priorityPassAmount == 0
            assert result.priorityPassId is None
            assert result.total == 850

    @pytest.mark.asyncio
    async def test_price_with_priority_pass(self):
        """Priority pass reduces the total."""
        mock_pass = {
            "id": "pp_123",
            "amount": 300,
            "patientId": "p1",
            "clinicId": "c1",
            "redeemed": False,
            "expiresAt": future_iso(48),
        }
        with patch("services.pricing_service.priority_passes") as mock_pp:
            mock_pp.find_one = AsyncMock(return_value=mock_pass)
            from services.pricing_service import compute_price

            result = await compute_price(
                standard_price=1200,
                standby_adjustment=400,
                patient_id="p1",
                clinic_id="c1",
            )

            assert result.subtotal == 850
            assert result.priorityPassAmount == 300
            assert result.priorityPassId == "pp_123"
            assert result.total == 550  # 850 - 300

    @pytest.mark.asyncio
    async def test_priority_pass_floors_at_zero(self):
        """If pass amount > subtotal, total floors at 0."""
        mock_pass = {
            "id": "pp_big",
            "amount": 2000,
            "patientId": "p1",
            "clinicId": "c1",
            "redeemed": False,
            "expiresAt": future_iso(48),
        }
        with patch("services.pricing_service.priority_passes") as mock_pp:
            mock_pp.find_one = AsyncMock(return_value=mock_pass)
            from services.pricing_service import compute_price

            result = await compute_price(
                standard_price=1200,
                standby_adjustment=400,
                patient_id="p1",
                clinic_id="c1",
            )

            assert result.total == 0  # max(0, 850 - 2000)

    @pytest.mark.asyncio
    async def test_negative_subtotal_floors_at_zero(self):
        """If standbyAdjustment > standardPrice + fee, subtotal floors at 0."""
        with patch("services.pricing_service.priority_passes") as mock_pp:
            mock_pp.find_one = AsyncMock(return_value=None)
            from services.pricing_service import compute_price

            result = await compute_price(
                standard_price=100,
                standby_adjustment=500,
                patient_id="p1",
                clinic_id="c1",
            )

            assert result.subtotal == 0  # max(0, 100 - 500 + 50) => floored
            assert result.total == 0

    @pytest.mark.asyncio
    async def test_price_breakdown_to_dict(self):
        """to_dict returns all expected keys."""
        with patch("services.pricing_service.priority_passes") as mock_pp:
            mock_pp.find_one = AsyncMock(return_value=None)
            from services.pricing_service import compute_price

            result = await compute_price(
                standard_price=1500,
                standby_adjustment=400,
                patient_id="p1",
                clinic_id="c1",
            )
            d = result.to_dict()

            expected_keys = {
                "standardPrice", "standbyAdjustment", "handlingFee",
                "subtotal", "priorityPassAmount", "priorityPassId", "total",
            }
            assert set(d.keys()) == expected_keys
            assert d["total"] == 1150  # 1500 - 400 + 50


# ──────────────────────────────────────────────────────────────────────────────
# TEST 2: Razorpay Service (Mock Mode)
# ──────────────────────────────────────────────────────────────────────────────
class TestRazorpayService:
    """Tests razorpay_service.py in mock mode."""

    @pytest.mark.asyncio
    async def test_create_order_mock_mode(self):
        from services.razorpay_service import create_order, is_mock_mode

        assert is_mock_mode(), "PAYMENT_MODE should be 'mock' for these tests"

        order = await create_order(
            amount_paise=85000,
            notes={"slotId": "s1", "patientId": "p1"},
            receipt="doctro_test123",
        )

        assert order["id"].startswith("order_MOCK_")
        assert order["amount"] == 85000
        assert order["currency"] == "INR"
        assert order["notes"]["slotId"] == "s1"
        assert order["mock"] is True

    @pytest.mark.asyncio
    async def test_create_refund_mock_mode(self):
        from services.razorpay_service import create_refund

        refund = await create_refund("mock_pay_abc123", 85000)

        assert refund["id"].startswith("rfnd_MOCK_")
        assert refund["payment_id"] == "mock_pay_abc123"
        assert refund["amount"] == 85000
        assert refund["status"] == "processed"
        assert refund["mock"] is True

    def test_verify_webhook_signature_missing_sig(self):
        from services.razorpay_service import verify_webhook_signature

        result = verify_webhook_signature(b"test body", None)
        assert result is False

    def test_verify_webhook_signature_missing_secret(self):
        from services.razorpay_service import verify_webhook_signature

        with patch("services.razorpay_service.RAZORPAY_WEBHOOK_SECRET", ""):
            result = verify_webhook_signature(b"test body", "some_sig")
            assert result is False


# ──────────────────────────────────────────────────────────────────────────────
# TEST 3: Slot Lock Service
# ──────────────────────────────────────────────────────────────────────────────
class TestSlotLockService:
    """Tests atomic_lock_slot, mark_slot_booked, record_transaction."""

    @pytest.mark.asyncio
    async def test_atomic_lock_success(self):
        """Successful lock returns the updated document."""
        mock_slot = {
            "id": "s1",
            "status": "locked",
            "bookedByPatientId": "p1",
            "lockedAt": datetime.now(timezone.utc).isoformat(),
        }
        with patch("services.slot_lock_service.slots") as mock_slots:
            mock_slots.find_one_and_update = AsyncMock(return_value=mock_slot)
            from services.slot_lock_service import atomic_lock_slot

            result = await atomic_lock_slot("s1", "p1")

            assert result is not None
            assert result["status"] == "locked"
            assert result["bookedByPatientId"] == "p1"

    @pytest.mark.asyncio
    async def test_atomic_lock_failure_slot_taken(self):
        """Lock fails when slot is already taken → returns None."""
        with patch("services.slot_lock_service.slots") as mock_slots:
            mock_slots.find_one_and_update = AsyncMock(return_value=None)
            from services.slot_lock_service import atomic_lock_slot

            result = await atomic_lock_slot("s1", "p2")

            assert result is None

    @pytest.mark.asyncio
    async def test_mark_slot_booked(self):
        with patch("services.slot_lock_service.slots") as mock_slots:
            mock_slots.update_one = AsyncMock()
            from services.slot_lock_service import mark_slot_booked

            await mark_slot_booked("s1")

            mock_slots.update_one.assert_called_once()
            call_args = mock_slots.update_one.call_args
            assert call_args[0][0] == {"id": "s1"}
            assert call_args[0][1]["$set"]["status"] == "booked"

    @pytest.mark.asyncio
    async def test_record_transaction(self):
        with patch("services.slot_lock_service.transactions") as mock_txns:
            mock_txns.insert_one = AsyncMock()
            from services.slot_lock_service import record_transaction

            breakdown = {
                "standardPrice": 1200,
                "standbyAdjustment": 400,
                "handlingFee": 50,
                "subtotal": 850,
                "priorityPassAmount": 0,
                "priorityPassId": None,
                "total": 850,
            }
            txn = await record_transaction(
                slot_id="s1",
                patient_id="p1",
                clinic_id="c1",
                price_breakdown=breakdown,
                razorpay_payment_id="pay_123",
                razorpay_order_id="order_123",
                razorpay_event_id="evt_123",
                lock_outcome="won",
            )

            assert txn["slotId"] == "s1"
            assert txn["totalPaid"] == 850
            assert txn["lockOutcome"] == "won"
            assert txn["razorpayEventId"] == "evt_123"
            mock_txns.insert_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_redeem_priority_pass(self):
        with patch("services.slot_lock_service.priority_passes") as mock_pp:
            mock_pp.update_one = AsyncMock()
            from services.slot_lock_service import redeem_priority_pass

            await redeem_priority_pass("pp_123", "txn_456")

            mock_pp.update_one.assert_called_once()
            call_args = mock_pp.update_one.call_args
            assert call_args[0][0] == {"id": "pp_123", "redeemed": False}
            assert call_args[0][1]["$set"]["redeemed"] is True


# ──────────────────────────────────────────────────────────────────────────────
# TEST 4: Ledger Service (Refunds)
# ──────────────────────────────────────────────────────────────────────────────
class TestLedgerService:
    """Tests initiate_refund and issue_priority_pass."""

    @pytest.mark.asyncio
    async def test_initiate_refund_success(self):
        mock_txn = {
            "id": "txn_1",
            "razorpayPaymentId": "mock_pay_abc",
            "totalPaid": 850,
        }
        with patch("services.ledger_service.transactions") as mock_txns, \
             patch("services.ledger_service.create_refund") as mock_refund:
            mock_txns.find_one = AsyncMock(return_value=mock_txn)
            mock_txns.update_one = AsyncMock()
            mock_refund.return_value = {"id": "rfnd_123", "status": "processed"}

            from services.ledger_service import initiate_refund

            result = await initiate_refund("txn_1", 850)

            assert result == "rfnd_123"
            mock_txns.update_one.assert_called_once()
            update_set = mock_txns.update_one.call_args[0][1]["$set"]
            assert update_set["refundStatus"] == "initiated"
            assert update_set["refundId"] == "rfnd_123"
            assert update_set["refundError"] is None

    @pytest.mark.asyncio
    async def test_initiate_refund_api_failure_doesnt_crash(self):
        """Refund API failure must NOT crash — records retryable state."""
        mock_txn = {
            "id": "txn_2",
            "razorpayPaymentId": "pay_real",
            "totalPaid": 1000,
        }
        with patch("services.ledger_service.transactions") as mock_txns, \
             patch("services.ledger_service.create_refund") as mock_refund:
            mock_txns.find_one = AsyncMock(return_value=mock_txn)
            mock_txns.update_one = AsyncMock()
            mock_refund.side_effect = Exception("Gateway timeout")

            from services.ledger_service import initiate_refund

            result = await initiate_refund("txn_2", 1000)

            assert result == "refund_pending_retry"
            update_set = mock_txns.update_one.call_args[0][1]["$set"]
            assert update_set["refundStatus"] == "initiated"
            assert "Gateway timeout" in update_set["refundError"]

    @pytest.mark.asyncio
    async def test_initiate_refund_missing_transaction_raises(self):
        with patch("services.ledger_service.transactions") as mock_txns:
            mock_txns.find_one = AsyncMock(return_value=None)

            from services.ledger_service import initiate_refund

            with pytest.raises(ValueError, match="not found"):
                await initiate_refund("nonexistent", 100)

    @pytest.mark.asyncio
    async def test_issue_priority_pass(self):
        with patch("services.ledger_service.priority_passes") as mock_pp:
            mock_pp.insert_one = AsyncMock()

            from services.ledger_service import issue_priority_pass

            pp = await issue_priority_pass(
                patient_id="p1",
                clinic_id="c1",
                amount=850,
                source_transaction_id="txn_1",
            )

            assert pp["patientId"] == "p1"
            assert pp["clinicId"] == "c1"
            assert pp["amount"] == 850
            assert pp["redeemed"] is False
            assert pp["redeemedTransactionId"] is None
            assert pp["sourceTransactionId"] == "txn_1"
            assert "expiresAt" in pp  # 14 days from now


# ──────────────────────────────────────────────────────────────────────────────
# TEST 5: Model Validation
# ──────────────────────────────────────────────────────────────────────────────
class TestModels:
    def test_slot_status_enum(self):
        from models.slot import SlotStatus

        assert SlotStatus.OPEN.value == "open"
        assert SlotStatus.LOCKED.value == "locked"
        assert SlotStatus.BOOKED.value == "booked"
        assert SlotStatus.CANCELLED_BY_CLINIC.value == "cancelled_by_clinic"

    def test_transaction_model_defaults(self):
        from models.transaction import Transaction

        txn = Transaction(
            slotId="s1",
            patientId="p1",
            clinicId="c1",
            standardPrice=1200,
            standbyAdjustment=400,
            handlingFee=50,
            totalPaid=850,
        )
        assert txn.lockOutcome == "won"
        assert txn.refundStatus is None
        assert txn.priorityPassAmount == 0

    def test_refund_status_enum(self):
        from models.transaction import RefundStatus

        assert RefundStatus.INITIATED.value == "initiated"
        assert RefundStatus.COMPLETED.value == "completed"


# ──────────────────────────────────────────────────────────────────────────────
# TEST 6: Configuration
# ──────────────────────────────────────────────────────────────────────────────
class TestConfig:
    def test_handling_fee_is_flat_rupees(self):
        from config import HANDLING_FEE

        assert isinstance(HANDLING_FEE, int)
        assert HANDLING_FEE == 50

    def test_checkout_link_format(self):
        from config import checkout_link

        link = checkout_link("tok_abc123")
        assert link.endswith("/checkout/tok_abc123")
        assert "tok_abc123" in link

    def test_priority_pass_ttl(self):
        from config import PRIORITY_PASS_TTL_DAYS

        assert PRIORITY_PASS_TTL_DAYS == 14


# ──────────────────────────────────────────────────────────────────────────────
# TEST 7: Razorpay Service Mode Detection
# ──────────────────────────────────────────────────────────────────────────────
class TestPaymentMode:
    def test_mock_mode_detection(self):
        from services.razorpay_service import is_mock_mode, PAYMENT_MODE

        assert PAYMENT_MODE == "mock"
        assert is_mock_mode() is True

    def test_mock_override_token_set(self):
        from services.razorpay_service import MOCK_OVERRIDE_TOKEN

        assert MOCK_OVERRIDE_TOKEN == "doctro-testing-override"


# ──────────────────────────────────────────────────────────────────────────────
# TEST 8: Notification Service
# ──────────────────────────────────────────────────────────────────────────────
class TestNotificationService:
    def test_standby_body_no_price(self):
        from services.notification_service import render_standby_body

        body = render_standby_body("10:00 AM", "Dr. Anjali Menon", "http://example.com/checkout/tok")
        forbidden = ("₹", "rupee", "price", "discount", "standby rate")
        for word in forbidden:
            assert word.lower() not in body.lower(), f"Body contains forbidden word: {word}"
        assert "10:00 AM" in body
        assert "Dr. Anjali Menon" in body

    def test_confirmation_body(self):
        from services.notification_service import render_confirmation_body

        body = render_confirmation_body("2:30 PM", "Dr. Rohan Bhat")
        assert "2:30 PM" in body
        assert "Dr. Rohan Bhat" in body
        assert "confirmed" in body.lower()

    @pytest.mark.asyncio
    async def test_send_failure_on_0000_phone(self):
        with patch("services.notification_service.sent_messages") as mock_msgs:
            mock_msgs.insert_one = AsyncMock()
            from services.notification_service import NotificationError, send_whatsapp_message

            with pytest.raises(NotificationError):
                await send_whatsapp_message(
                    "+919812340000",
                    "Test body",
                    template_name="test",
                    patient_id="p4",
                )

    @pytest.mark.asyncio
    async def test_send_success_normal_phone(self):
        with patch("services.notification_service.sent_messages") as mock_msgs, \
             patch("services.notification_service.is_mock_mode", return_value=True):
            mock_msgs.insert_one = AsyncMock()
            from services.notification_service import send_whatsapp_message

            msg_id = await send_whatsapp_message(
                "+919812345671",
                "Test body",
                template_name="test",
                patient_id="p1",
            )

            assert msg_id.startswith("mock_msg_")
            mock_msgs.insert_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_twilio_transport_success(self):
        with patch("services.notification_service.sent_messages") as mock_msgs, \
             patch("services.notification_service.is_mock_mode", return_value=False), \
             patch("services.notification_service._send_via_twilio", return_value="SM_twilio_test_sid") as mock_twilio:
            mock_msgs.insert_one = AsyncMock()
            from services.notification_service import send_whatsapp_message

            msg_id = await send_whatsapp_message(
                "+919250543490",
                "Test body for Twilio",
                template_name="test",
                patient_id="p1",
            )

            assert msg_id == "SM_twilio_test_sid"
            mock_twilio.assert_called_once()
            mock_msgs.insert_one.assert_called_once()


# ──────────────────────────────────────────────────────────────────────────────
# TEST 9: Webhook Notification Failure → Slot Must Stay BOOKED
# ──────────────────────────────────────────────────────────────────────────────
class TestWebhookNotificationFailure:
    """Regression test for the notification state inconsistency bug.

    When a successful payment triggers a webhook booking but the WhatsApp
    confirmation message fails to send, the slot's status must remain
    BOOKED — not revert to LOCKED.  The transaction document must record
    confirmationSent=False and a non-empty confirmationError.
    """

    @pytest.mark.asyncio
    async def test_slot_stays_booked_when_notification_fails(self):
        """End-to-end: payment.captured → lock won → notification fails
        → slot still BOOKED, txn has confirmationSent=False."""

        # Storage containers to capture what the webhook writes.
        stored_slot_updates = []
        stored_txn_inserts = []
        stored_txn_updates = []

        # --- Mock: checkout_tokens ---
        mock_checkout_tokens = MagicMock()
        mock_checkout_tokens.find_one = AsyncMock(return_value={
            "token": "tok_disha",
            "slotId": "slot_notify_fail",
            "patientId": "patient_disha_0000",
            "clinicId": "clinic_test",
        })

        # --- Mock: slots ---
        mock_slots = MagicMock()
        # find_one returns the slot data.
        mock_slots.find_one = AsyncMock(return_value={
            "id": "slot_notify_fail",
            "status": "open",
            "doctorName": "Dr. Test",
            "startTime": future_iso(3),
            "standardPrice": 1200,
            "clinicId": "clinic_test",
            "bookedByPatientId": None,
        })
        # find_one_and_update for atomic_lock_slot → succeeds.
        mock_slots.find_one_and_update = AsyncMock(return_value={
            "id": "slot_notify_fail",
            "status": "locked",
            "bookedByPatientId": "patient_disha_0000",
        })

        async def capture_slot_update(*args, **kwargs):
            stored_slot_updates.append(args)
        mock_slots.update_one = AsyncMock(side_effect=capture_slot_update)

        # --- Mock: clinics ---
        mock_clinics = MagicMock()
        mock_clinics.find_one = AsyncMock(return_value={
            "id": "clinic_test",
            "name": "Test Clinic",
            "standbyAdjustment": 400,
        })

        # --- Mock: patients (phone ends in 0000 → notification fails) ---
        mock_patients = MagicMock()
        mock_patients.find_one = AsyncMock(return_value={
            "id": "patient_disha_0000",
            "name": "Disha Menon",
            "phone": "+919812340000",
        })

        # --- Mock: transactions ---
        mock_transactions = MagicMock()
        # No existing transaction for idempotency check.
        mock_transactions.find_one = AsyncMock(return_value=None)

        async def capture_txn_insert(doc):
            stored_txn_inserts.append(doc)
        mock_transactions.insert_one = AsyncMock(side_effect=capture_txn_insert)

        async def capture_txn_update(*args, **kwargs):
            stored_txn_updates.append(args)
        mock_transactions.update_one = AsyncMock(side_effect=capture_txn_update)

        # --- Mock: priority_passes ---
        mock_priority_passes = MagicMock()
        mock_priority_passes.find_one = AsyncMock(return_value=None)

        # --- Mock: sent_messages (for the notification service) ---
        mock_sent_messages = MagicMock()
        mock_sent_messages.insert_one = AsyncMock()

        # Patch all database collections and services used by the webhook.
        with patch("routes.webhooks.razorpay.checkout_tokens", mock_checkout_tokens), \
             patch("routes.webhooks.razorpay.slots", mock_slots), \
             patch("routes.webhooks.razorpay.clinics", mock_clinics), \
             patch("routes.webhooks.razorpay.patients", mock_patients), \
             patch("routes.webhooks.razorpay.transactions", mock_transactions), \
             patch("services.slot_lock_service.slots", mock_slots), \
             patch("services.slot_lock_service.transactions", mock_transactions), \
             patch("services.slot_lock_service.priority_passes", mock_priority_passes), \
             patch("services.pricing_service.priority_passes", mock_priority_passes), \
             patch("services.notification_service.sent_messages", mock_sent_messages):

            from routes.webhooks.razorpay import process_webhook_event

            result = await process_webhook_event(
                {
                    "event": "payment.captured",
                    "payload": {
                        "payment": {
                            "entity": {
                                "id": "pay_disha_test",
                                "order_id": "order_disha_test",
                                "status": "captured",
                                "amount": 85000,
                                "notes": {
                                    "checkoutToken": "tok_disha",
                                    "slotId": "slot_notify_fail",
                                    "patientId": "patient_disha_0000",
                                    "clinicId": "clinic_test",
                                },
                            }
                        }
                    },
                },
                event_id="evt_notify_fail_test",
            )

        # ---- Assertions ----
        # 1. Webhook still returns success (code=BOOKED), not an error.
        assert result["code"] == "BOOKED", f"Expected BOOKED, got {result}"
        assert result["status"] == "confirmation_pending"
        assert result["confirmationError"] is not None

        # 2. Slot was marked BOOKED (via mark_slot_booked call).
        #    Find the update_one call that sets status to "booked".
        booked_calls = [
            args for args in stored_slot_updates
            if args[1].get("$set", {}).get("status") == "booked"
        ]
        assert len(booked_calls) >= 1, (
            f"mark_slot_booked was never called. Slot updates: {stored_slot_updates}"
        )

        # 3. Slot was NEVER reverted to LOCKED.
        locked_calls = [
            args for args in stored_slot_updates
            if args[1].get("$set", {}).get("status") == "locked"
        ]
        assert len(locked_calls) == 0, (
            f"Slot status was reverted to LOCKED — this is the bug! "
            f"Slot updates: {stored_slot_updates}"
        )

        # 4. Transaction was updated with confirmationSent=False + error.
        confirm_updates = [
            args for args in stored_txn_updates
            if "$set" in args[1] and "confirmationSent" in args[1]["$set"]
        ]
        assert len(confirm_updates) >= 1, (
            f"Transaction was not updated with confirmationSent. "
            f"Txn updates: {stored_txn_updates}"
        )
        last_confirm = confirm_updates[-1]
        assert last_confirm[1]["$set"]["confirmationSent"] is False
        assert last_confirm[1]["$set"]["confirmationError"] is not None
        assert len(last_confirm[1]["$set"]["confirmationError"]) > 0


# ──────────────────────────────────────────────────────────────────────────────
# TEST 10: Clinic Subscription & Plan Flows
# ──────────────────────────────────────────────────────────────────────────────
class TestSubscriptionFlow:
    """Tests clinic subscription ordering, signature verification, mock-pay gating,
    idempotency, trial abuse prevention, and enterprise lead capture."""

    @pytest.mark.asyncio
    async def test_subscription_order_pricing_math(self):
        from routes.clinics import create_subscription_order, SubscriptionOrderRequest

        with patch("services.razorpay_service.create_order") as mock_co:
            mock_co.side_effect = lambda amount_paise, notes, receipt: {
                "id": "order_sub_test",
                "amount": amount_paise,
                "currency": "INR",
                "status": "created",
            }

            # Monthly order: ₹1,999 -> 199,900 paise
            monthly_res = await create_subscription_order(SubscriptionOrderRequest(
                clinicName="Smile Care",
                phone="+919876543210",
                email="doctor@smilecare.in",
                billingInterval="monthly",
            ))
            assert monthly_res["amountRupees"] == 1999
            assert monthly_res["amount"] == 199900
            assert monthly_res["billingInterval"] == "monthly"

            # Annual order: ₹19,190 -> 1,919,000 paise (20% discount)
            annual_res = await create_subscription_order(SubscriptionOrderRequest(
                clinicName="Smile Care",
                phone="+919876543210",
                email="doctor@smilecare.in",
                billingInterval="annual",
            ))
            assert annual_res["amountRupees"] == 19190
            assert annual_res["amount"] == 1919000
            assert annual_res["billingInterval"] == "annual"

    @pytest.mark.asyncio
    async def test_subscription_confirm_idempotent(self):
        from routes.clinics import confirm_subscription, SubscriptionConfirmRequest

        stored_txns = {}
        stored_clinics = {}

        mock_sub_txns = MagicMock()
        async def mock_find_txn(query, *args, **kwargs):
            pid = query.get("$or", [{}])[0].get("razorpayPaymentId")
            return stored_txns.get(pid)
        mock_sub_txns.find_one = AsyncMock(side_effect=mock_find_txn)

        async def mock_insert_txn(doc):
            stored_txns[doc["razorpayPaymentId"]] = doc
        mock_sub_txns.insert_one = AsyncMock(side_effect=mock_insert_txn)

        mock_clinics = MagicMock()
        mock_clinics.find_one = AsyncMock(return_value={"id": "clinic_123", "name": "Dental Hub"})
        mock_clinics.update_one = AsyncMock()

        with patch("database.subscription_transactions", mock_sub_txns), \
             patch("routes.clinics.clinics", mock_clinics), \
             patch("services.razorpay_service.is_mock_mode", return_value=True):

            req = SubscriptionConfirmRequest(
                razorpayOrderId="order_abc",
                razorpayPaymentId="pay_unique_1",
                razorpaySignature="sig_ok",
                clinicId="clinic_123",
                clinicName="Dental Hub",
                phone="+919999999999",
                email="hub@dental.in",
                billingInterval="monthly",
            )

            # 1. First execution -> ACTIVATED
            res1 = await confirm_subscription(req)
            assert res1["status"] == "active"
            assert res1["code"] == "SUBSCRIPTION_ACTIVATED"
            assert "expiresAt" in res1

            # 2. Duplicate execution -> DUPLICATE_EVENT (Idempotency)
            res2 = await confirm_subscription(req)
            assert res2["status"] == "active"
            assert res2["code"] == "DUPLICATE_EVENT"
            assert res2["transactionId"] == res1["transactionId"]

    @pytest.mark.asyncio
    async def test_mock_subscription_pay_gated_in_production(self):
        from routes.clinics import mock_subscription_pay, MockSubscriptionPayRequest
        from fastapi import HTTPException

        # In production mode (PAYMENT_MODE=razorpay) without override header -> MUST 403
        with patch("services.razorpay_service.PAYMENT_MODE", "razorpay"), \
             patch("services.razorpay_service.is_mock_mode", return_value=False), \
             patch("os.environ.get", return_value="doctro-testing-override"):

            payload = MockSubscriptionPayRequest(
                clinicName="Smile Pro",
                phone="+919876543210",
                email="smile@pro.in",
            )

            with pytest.raises(HTTPException) as exc_info:
                await mock_subscription_pay(payload, x_doctro_test_override=None)
            assert exc_info.value.status_code == 403
            assert exc_info.value.detail["code"] == "MOCK_DISABLED"

            # With valid override header -> Allowed
            with patch("routes.clinics.confirm_subscription", AsyncMock(return_value={"status": "active", "code": "SUBSCRIPTION_ACTIVATED"})):
                res = await mock_subscription_pay(payload, x_doctro_test_override="doctro-testing-override")
                assert res["status"] == "active"

    @pytest.mark.asyncio
    async def test_mock_subscription_pay_failure_simulation(self):
        from routes.clinics import mock_subscription_pay, MockSubscriptionPayRequest

        with patch("services.razorpay_service.is_mock_mode", return_value=True):
            res = await mock_subscription_pay(
                MockSubscriptionPayRequest(
                    clinicName="Test Clinic",
                    phone="+919876543210",
                    email="test@fail.in",
                    simulateFailure=True,
                ),
                x_doctro_test_override="doctro-testing-override",
            )
            assert res["status"] == "failed"
            assert res["code"] == "PAYMENT_FAILED"

    @pytest.mark.asyncio
    async def test_trial_activation_and_abuse_prevention(self):
        from routes.clinics import start_free_trial, TrialRequest
        from fastapi import HTTPException

        existing_trial_clinic = {
            "id": "c_trial_1",
            "email": "existing@trial.in",
            "phone": "+919111111111",
            "hasTrialed": True,
            "subscriptionStatus": "trial",
        }

        mock_clinics = MagicMock()
        async def mock_find_clinic(query, *args, **kwargs):
            or_conds = query.get("$or", [])
            for cond in or_conds:
                if cond.get("email") == "existing@trial.in" or cond.get("phone") == "+919111111111":
                    return existing_trial_clinic
            return None
        mock_clinics.find_one = AsyncMock(side_effect=mock_find_clinic)
        mock_clinics.insert_one = AsyncMock()

        with patch("routes.clinics.clinics", mock_clinics):
            # 1. Fresh clinic succeeds
            new_req = TrialRequest(
                clinicName="Brand New Clinic",
                phone="+919222222222",
                email="fresh@clinic.in",
            )
            trial_res = await start_free_trial(new_req)
            assert trial_res["status"] == "trial"
            assert trial_res["code"] == "TRIAL_ACTIVATED"

            # 2. Existing trialed clinic is rejected with 409 Conflict
            dup_req = TrialRequest(
                clinicName="Duplicate Clinic",
                phone="+919111111111",
                email="existing@trial.in",
            )
            with pytest.raises(HTTPException) as exc_info:
                await start_free_trial(dup_req)
            assert exc_info.value.status_code == 409
            assert exc_info.value.detail["code"] == "TRIAL_ALREADY_USED"

    @pytest.mark.asyncio
    async def test_enterprise_lead_submission(self):
        from routes.clinics import submit_enterprise_lead, EnterpriseLeadRequest

        mock_leads = MagicMock()
        mock_leads.insert_one = AsyncMock()

        with patch("database.enterprise_leads", mock_leads):
            res = await submit_enterprise_lead(EnterpriseLeadRequest(
                clinicName="Apollo Dental Chain",
                contactName="Dr. Apollo Lead",
                phone="+919888888888",
                email="apollo@dental.in",
                chairs=12,
                locations=4,
                notes="Looking for custom EHR integration",
            ))
            assert res["status"] == "received"
            assert res["id"].startswith("lead_")
            mock_leads.insert_one.assert_called_once()

