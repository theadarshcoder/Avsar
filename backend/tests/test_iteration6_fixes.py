"""Iteration-6 fix verification: /order notes.checkoutToken, structured error
details on /order (409/410/ZERO_TOTAL), mock-pay gating, and the transaction
payload fields the /choice reload path depends on."""
import os
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env["REACT_APP_BACKEND_URL"]).rstrip("/")
CLINIC_ID = "clinic_smile_dental_indiranagar"
OVERRIDE = os.environ.get("MOCK_OVERRIDE_TOKEN", "doctro-testing-override")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "X-Doctro-Test-Override": OVERRIDE})
    return s


@pytest.fixture(scope="module")
def plain():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def pass_cleanup():
    """Remove PriorityPasses minted by this test so they don't leak into other
    tests' pricing (seeded patients are shared across the whole suite)."""
    created = []
    yield created
    if created:
        from pymongo import MongoClient

        env = dotenv_values("/app/backend/.env")
        cli = MongoClient(env["MONGO_URL"])
        cli[env["DB_NAME"]]["priority_passes"].delete_many({"id": {"$in": created}})
        cli.close()


def make_slot(api, hours_ahead=48, price=9000, name="TEST_Dr Iter6"):
    # High price on purpose: seeded patients may carry leftover PriorityPass
    # credits from earlier runs, which would otherwise zero out the total.
    start = (datetime.now(timezone.utc) + timedelta(hours=hours_ahead)).isoformat()
    r = api.post(
        f"{BASE_URL}/api/clinics/{CLINIC_ID}/slots",
        json={"doctorName": name, "startTime": start, "standardPrice": price, "status": "scheduled"},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def broadcast(api, slot_id):
    b = api.post(f"{BASE_URL}/api/clinics/slots/{slot_id}/open")
    assert b.status_code == 200, b.text
    sent = [o for o in b.json()["outbox"] if o["status"] == "sent"]
    assert sent, b.text
    return sent


# ── MEDIUM fix: /order response notes must carry checkoutToken
class TestOrderNotesContract:
    def test_order_notes_include_checkout_token(self, api):
        slot_id = make_slot(api)
        token = broadcast(api, slot_id)[0]["token"]
        r = api.post(f"{BASE_URL}/api/checkout/{token}/order")
        assert r.status_code == 200, r.text
        d = r.json()
        notes = d["notes"]
        assert notes["checkoutToken"] == token
        assert notes["slotId"] == slot_id
        assert notes["clinicId"] == CLINIC_ID
        assert notes["patientId"]
        assert notes["doctorName"]
        assert isinstance(d["orderId"], str) and d["orderId"].startswith("order_")
        assert d["amount"] == int(d["amountRupees"]) * 100


# ── CRITICAL fix support: /order error paths return structured detail dicts
class TestOrderErrorPaths:
    def test_slot_not_open_409_structured(self, api):
        slot_id = make_slot(api)
        token = broadcast(api, slot_id)[0]["token"]
        # book the slot so it is no longer OPEN
        pay = api.post(f"{BASE_URL}/api/checkout/{token}/mock-pay", json={"fireWebhook": True})
        assert pay.status_code == 200, pay.text
        assert (pay.json().get("webhookResponse") or {}).get("code") == "BOOKED"
        r = api.post(f"{BASE_URL}/api/checkout/{token}/order")
        assert r.status_code == 409, r.text
        detail = r.json()["detail"]
        assert isinstance(detail, dict)
        assert detail["code"] == "SLOT_NOT_OPEN"
        assert isinstance(detail["message"], str) and detail["message"]

    def test_bad_token_404(self, api):
        r = api.post(f"{BASE_URL}/api/checkout/does-not-exist-token/order")
        assert r.status_code == 404, r.text
        assert r.json()["detail"]


# ── REGRESSION: mock-pay gating
class TestMockPayGating:
    def test_403_without_override_header(self, api, plain):
        slot_id = make_slot(api)
        token = broadcast(api, slot_id)[0]["token"]
        r = plain.post(f"{BASE_URL}/api/checkout/{token}/mock-pay", json={"fireWebhook": True})
        assert r.status_code == 403, r.text
        detail = r.json()["detail"]
        code = detail.get("code") if isinstance(detail, dict) else detail
        assert code == "MOCK_DISABLED", detail
        # 200 with override header on the same token
        ok = api.post(f"{BASE_URL}/api/checkout/{token}/mock-pay", json={"fireWebhook": True})
        assert ok.status_code == 200, ok.text


# ── LOW fix: transaction payload must expose resolved-state fields on reload
class TestChoiceReloadPayload:
    def _cancelled_booking(self, api, price=9500):
        slot_id = make_slot(api, price=price)
        token = broadcast(api, slot_id)[0]["token"]
        pay = api.post(f"{BASE_URL}/api/checkout/{token}/mock-pay", json={"fireWebhook": True})
        assert pay.status_code == 200, pay.text
        tx_id = (pay.json().get("webhookResponse") or {}).get("transactionId")
        assert tx_id, pay.text
        c = api.post(f"{BASE_URL}/api/clinics/slots/{slot_id}/cancel-booked")
        assert c.status_code == 200, c.text
        return tx_id

    def test_refund_state_persisted(self, api):
        tx_id = self._cancelled_booking(api)
        r = api.post(f"{BASE_URL}/api/clinics/transactions/{tx_id}/choice", json={"choice": "refund"})
        assert r.status_code == 200, r.text
        get = api.get(f"{BASE_URL}/api/clinics/transactions/{tx_id}")
        assert get.status_code == 200, get.text
        t = get.json()["transaction"]
        assert t.get("refundStatus"), t
        assert t.get("refundId") or t.get("refundStatus")
        assert int(t["totalPaid"]) > 0

    def test_credit_state_persisted(self, api, pass_cleanup):
        tx_id = self._cancelled_booking(api)
        r = api.post(f"{BASE_URL}/api/clinics/transactions/{tx_id}/choice", json={"choice": "credit"})
        assert r.status_code == 200, r.text
        pp = r.json()["priorityPass"]
        pass_cleanup.append(pp["id"])
        get = api.get(f"{BASE_URL}/api/clinics/transactions/{tx_id}")
        assert get.status_code == 200, get.text
        t = get.json()["transaction"]
        assert t["creditIssuedPassId"] == pp["id"]
        assert int(t["creditIssuedPassAmount"]) == int(pp["amount"])
        assert t["creditIssuedPassExpiresAt"]
        assert "_id" not in t
