"""Razorpay TEST-MODE integration tests (iteration 5).

Covers:
* POST /api/checkout/{token}/order  — real order creation, notes, keyId, amount
* order refusal for non-open / expired slots
* POST /api/webhooks/razorpay       — signature 401, valid 200, idempotency,
                                      notes-based correlation
* GET  /api/checkout/{token}/outcome — pending / booked / lost_race / expired
* mock-pay gating (403 MOCK_DISABLED without override header)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

_env = dotenv_values("/app/frontend/.env")
BASE = (os.environ.get("REACT_APP_BACKEND_URL") or _env.get("REACT_APP_BACKEND_URL", "")).rstrip("/")
API = f"{BASE}/api"

_benv = dotenv_values("/app/backend/.env")
KEY_ID = _benv.get("RAZORPAY_KEY_ID")
WEBHOOK_SECRET = _benv.get("RAZORPAY_WEBHOOK_SECRET")
OVERRIDE = _benv.get("MOCK_OVERRIDE_TOKEN")
CLINIC = "clinic_smile_dental_indiranagar"

OVERRIDE_HEADERS = {"X-avsar-Test-Override": OVERRIDE}


def sign(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def broadcast(api, slot_id):
    r = api.post(f"{API}/clinics/slots/{slot_id}/open")
    assert r.status_code == 200, r.text
    return r.json()


def first_sent_token(bc):
    sent = [o for o in bc["outbox"] if o["status"] == "sent"]
    assert sent, f"no sent outbox entries: {bc}"
    return sent


# ────────────────────────── order creation ──────────────────────────
class TestRealOrderCreation:
    def test_real_order_created(self, api):
        bc = broadcast(api, "slot_today_1000")
        tokens = first_sent_token(bc)
        token = tokens[0]["token"]

        r = api.post(f"{API}/checkout/{token}/order")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["orderId"].startswith("order_"), d
        assert not d["orderId"].startswith("order_MOCK_"), "mock order returned in razorpay mode"
        assert d["amount"] == 85000, d
        assert d["keyId"] == KEY_ID
        assert d["paymentMode"] == "razorpay"
        assert d["notes"]["slotId"] == "slot_today_1000"
        assert d["notes"]["patientId"] == tokens[0]["patientId"]
        # NOTE: the API-response `notes` object intentionally differs from the
        # notes sent to the gateway (verified separately below).

    def test_order_response_notes_include_checkout_token(self, api):
        """Spec requires response notes.checkoutToken == token.

        KNOWN DEVIATION: the response `notes` swaps checkoutToken for
        doctorName. Gateway-side notes DO contain checkoutToken (verified in
        tests/_verify_order_notes.py), so webhook correlation is unaffected.
        """
        bc = broadcast(api, "slot_today_1000")
        tok = first_sent_token(bc)[0]
        token = tok["token"]
        d = api.post(f"{API}/checkout/{token}/order").json()
        assert d["notes"].get("checkoutToken") == token, (
            f"checkoutToken missing from response notes: {d['notes']}"
        )

    def test_order_404_unknown_token(self, api):
        r = api.post(f"{API}/checkout/{uuid.uuid4().hex}/order")
        assert r.status_code == 404, r.text


# ────────────────────── stale / expired slot refusal ──────────────────────
class TestOrderRefusesStaleSlots:
    def test_slot_not_open_after_booking(self, api):
        bc = broadcast(api, "slot_today_1130")
        sent = first_sent_token(bc)
        winner, loser = sent[0]["token"], sent[1]["token"]

        # book via override mock-pay
        r = api.post(
            f"{API}/checkout/{winner}/mock-pay", json={}, headers=OVERRIDE_HEADERS
        )
        assert r.status_code == 200, r.text
        assert r.json()["webhookResponse"]["code"] == "BOOKED", r.text

        r = api.post(f"{API}/checkout/{loser}/order")
        assert r.status_code == 409, r.text
        assert "SLOT_NOT_OPEN" in r.text

    def test_expired_slot_order_410(self, api):
        # create a slot in the past
        r = api.post(
            f"{API}/clinics/{CLINIC}/slots",
            json={
                "doctorName": "Dr. Past",
                "startTime": "2020-01-01T10:00:00+00:00",
                "durationMinutes": 30,
                "standardPrice": 1200,
            },
        )
        assert r.status_code in (200, 201), r.text
        slot_id = r.json()["id"]
        bc = broadcast(api, slot_id)
        token = first_sent_token(bc)[0]["token"]

        o = api.post(f"{API}/checkout/{token}/order")
        assert o.status_code == 410, o.text
        assert "SLOT_EXPIRED" in o.text

        # outcome endpoint for expired-slot token: no txn yet -> pending
        oc = api.get(f"{API}/checkout/{token}/outcome")
        assert oc.status_code == 200
        assert oc.json()["state"] == "pending"

        # webhook on an expired slot -> SLOT_EXPIRED + refund
        pay = api.post(
            f"{API}/checkout/{token}/mock-pay", json={}, headers=OVERRIDE_HEADERS
        )
        assert pay.status_code == 200, pay.text
        assert pay.json()["webhookResponse"]["code"] == "SLOT_EXPIRED", pay.text

        oc = api.get(f"{API}/checkout/{token}/outcome")
        assert oc.json()["state"] == "expired", oc.text
        assert oc.json()["code"] == "SLOT_EXPIRED"


# ────────────────────────── webhook signature ──────────────────────────
class TestWebhookSignature:
    @pytest.fixture(scope="class")
    def booked_slot_ctx(self, api):
        """slot_today_1630 broadcast, first patient books, second is the loser."""
        bc = broadcast(api, "slot_today_1630")
        sent = first_sent_token(bc)
        winner, loser = sent[0], sent[1]
        r = api.post(
            f"{API}/checkout/{winner['token']}/mock-pay", json={}, headers=OVERRIDE_HEADERS
        )
        assert r.json()["webhookResponse"]["code"] == "BOOKED", r.text
        return {
            "winner": winner,
            "loser": loser,
            "slotId": "slot_today_1630",
            "clinicId": CLINIC,
        }

    def _payload(self, ctx, token_owner):
        return {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_TEST",
                        "order_id": "order_TEST",
                        "status": "captured",
                        "amount": 85000,
                        "notes": {
                            "checkoutToken": token_owner["token"],
                            "slotId": ctx["slotId"],
                            "patientId": token_owner["patientId"],
                            "clinicId": ctx["clinicId"],
                        },
                    }
                }
            },
        }

    def test_wrong_signature_401(self, api, booked_slot_ctx):
        body = json.dumps(self._payload(booked_slot_ctx, booked_slot_ctx["loser"])).encode()
        before = api.get(f"{API}/checkout/{booked_slot_ctx['loser']['token']}/outcome").json()
        r = requests.post(
            f"{API}/webhooks/razorpay",
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": sign(body, "WRONG_SECRET"),
                "X-Razorpay-Event-Id": "evt_bad",
            },
        )
        assert r.status_code == 401, r.text
        after = api.get(f"{API}/checkout/{booked_slot_ctx['loser']['token']}/outcome").json()
        assert after["state"] == before["state"] == "pending", (before, after)

    def test_missing_signature_401(self, api, booked_slot_ctx):
        body = json.dumps(self._payload(booked_slot_ctx, booked_slot_ctx["loser"])).encode()
        r = requests.post(
            f"{API}/webhooks/razorpay",
            data=body,
            headers={"Content-Type": "application/json", "X-Razorpay-Event-Id": "evt_nosig"},
        )
        assert r.status_code == 401, r.text

    def test_valid_signature_lost_race_and_idempotency(self, api, booked_slot_ctx):
        loser = booked_slot_ctx["loser"]
        body = json.dumps(self._payload(booked_slot_ctx, loser)).encode()
        event_id = f"evt_sig_ok_{uuid.uuid4().hex[:8]}"
        headers = {
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sign(body, WEBHOOK_SECRET),
            "X-Razorpay-Event-Id": event_id,
        }
        r = requests.post(f"{API}/webhooks/razorpay", data=body, headers=headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"] == "SLOT_JUST_TAKEN", d
        assert d["status"] == "refund_initiated", d
        txn_id = d["transactionId"]

        # outcome reflects lost_race + refund
        oc = api.get(f"{API}/checkout/{loser['token']}/outcome").json()
        assert oc["state"] == "lost_race"
        assert oc["code"] == "SLOT_JUST_TAKEN"
        assert oc["refundStatus"] == "initiated", oc
        assert oc["transactionId"] == txn_id

        # idempotency: exact replay
        txn_count_before = len(
            api.get(f"{API}/slots/{booked_slot_ctx['slotId']}/transactions").json()
        )
        r2 = requests.post(f"{API}/webhooks/razorpay", data=body, headers=headers)
        assert r2.status_code == 200, r2.text
        assert r2.json()["code"] == "DUPLICATE_EVENT", r2.text
        txn_count_after = len(
            api.get(f"{API}/slots/{booked_slot_ctx['slotId']}/transactions").json()
        )
        assert txn_count_after == txn_count_before, "duplicate event created a 2nd transaction"

    def test_notes_only_correlation_no_toplevel_token(self, api):
        """Real Razorpay path: checkoutToken only inside payment.entity.notes."""
        r = api.post(
            f"{API}/clinics/{CLINIC}/slots",
            json={
                "doctorName": "Dr. Notes",
                "startTime": "2030-01-01T10:00:00+00:00",
                "durationMinutes": 30,
                "standardPrice": 1200,
            },
        )
        slot_id = r.json()["id"]
        bc = broadcast(api, slot_id)
        tok = first_sent_token(bc)[0]

        body = json.dumps(
            {
                "event": "payment.captured",
                "payload": {
                    "payment": {
                        "entity": {
                            "id": "pay_NOTES",
                            "order_id": "order_NOTES",
                            "status": "captured",
                            "amount": 85000,
                            "notes": {
                                "checkoutToken": tok["token"],
                                "slotId": slot_id,
                                "patientId": tok["patientId"],
                                "clinicId": CLINIC,
                            },
                        }
                    }
                },
            }
        ).encode()
        headers = {
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sign(body, WEBHOOK_SECRET),
            "X-Razorpay-Event-Id": f"evt_notes_{uuid.uuid4().hex[:8]}",
        }
        r = requests.post(f"{API}/webhooks/razorpay", data=body, headers=headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"] == "BOOKED", d
        oc = api.get(f"{API}/checkout/{tok['token']}/outcome").json()
        assert oc["state"] == "booked"
        assert oc["code"] == "BOOKED"
        assert oc["transactionId"] == d["transactionId"]

    def test_missing_event_id_400(self, api):
        body = json.dumps({"event": "payment.captured", "payload": {}}).encode()
        r = requests.post(
            f"{API}/webhooks/razorpay",
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": sign(body, WEBHOOK_SECRET),
            },
        )
        assert r.status_code == 400, r.text


# ────────────────────────── mock-pay gating ──────────────────────────
class TestMockPayGating:
    def test_mock_pay_forbidden_without_header(self, api):
        r = api.post(
            f"{API}/clinics/{CLINIC}/slots",
            json={
                "doctorName": "Dr. Gate",
                "startTime": "2030-02-01T10:00:00+00:00",
                "durationMinutes": 30,
                "standardPrice": 1200,
            },
        )
        slot_id = r.json()["id"]
        bc = broadcast(api, slot_id)
        sent = first_sent_token(bc)
        t1, t2 = sent[0]["token"], sent[1]["token"]

        r = api.post(f"{API}/checkout/{t1}/mock-pay", json={})
        assert r.status_code == 403, r.text
        detail = r.json()["detail"]
        assert detail["code"] == "MOCK_DISABLED", detail

        r = api.post(f"{API}/checkout/{t2}/mock-pay", json={}, headers=OVERRIDE_HEADERS)
        assert r.status_code == 200, r.text
        assert r.json()["webhookResponse"]["code"] == "BOOKED", r.text

    def test_mock_pay_wrong_override_value(self, api):
        bc_slot = api.post(
            f"{API}/clinics/{CLINIC}/slots",
            json={
                "doctorName": "Dr. Gate2",
                "startTime": "2030-03-01T10:00:00+00:00",
                "durationMinutes": 30,
                "standardPrice": 1200,
            },
        ).json()["id"]
        bc = broadcast(api, bc_slot)
        token = first_sent_token(bc)[0]["token"]
        r = api.post(
            f"{API}/checkout/{token}/mock-pay",
            json={},
            headers={"X-avsar-Test-Override": "nope"},
        )
        assert r.status_code == 403, r.text
        assert r.json()["detail"]["code"] == "MOCK_DISABLED"
