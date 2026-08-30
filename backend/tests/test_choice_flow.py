"""Smoke: full payment -> clinic cancel-booked -> choice flow (mocked Razorpay)."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env["REACT_APP_BACKEND_URL"]).rstrip("/")
CLINIC_ID = "clinic_smile_dental_indiranagar"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        # Live server may be in PAYMENT_MODE=razorpay; mock-pay requires this.
        "X-avsar-Test-Override": os.environ.get("MOCK_OVERRIDE_TOKEN", "avsar-testing-override"),
    })
    return s


def make_cancelled_booking(api):
    """Create slot -> broadcast -> mock-pay -> cancel-booked. Returns txId."""
    slot = api.post(
        f"{BASE_URL}/api/clinics/{CLINIC_ID}/slots",
        json={
            "doctorName": "TEST_Dr Choice",
            "startTime": "2026-12-01T10:00:00+00:00",
            "standardPrice": 1200,
            "status": "scheduled",
        },
    )
    assert slot.status_code == 200, slot.text
    slot_id = slot.json()["id"]

    b = api.post(f"{BASE_URL}/api/clinics/slots/{slot_id}/open")
    assert b.status_code == 200, b.text
    outbox = b.json()["outbox"]
    ok = [o for o in outbox if o["status"] == "sent"]
    assert ok, b.text
    token = ok[0]["token"]

    pay = api.post(f"{BASE_URL}/api/checkout/{token}/mock-pay", json={"fireWebhook": True})
    assert pay.status_code == 200, pay.text
    wh = pay.json().get("webhookResponse") or {}
    tx_id = wh.get("transactionId") or (wh.get("transaction") or {}).get("id")
    assert tx_id, pay.text

    cancel = api.post(f"{BASE_URL}/api/clinics/slots/{slot_id}/cancel-booked")
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()["transaction"]["id"] == tx_id
    return slot_id, tx_id


class TestChoiceFlow:
    def test_refund_choice(self, api):
        _, tx_id = make_cancelled_booking(api)
        r = api.post(f"{BASE_URL}/api/clinics/transactions/{tx_id}/choice", json={"choice": "refund"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["choice"] == "refund"
        assert d["refundId"]
        assert d["amount"] > 0
        # double choice blocked
        again = api.post(f"{BASE_URL}/api/clinics/transactions/{tx_id}/choice", json={"choice": "credit"})
        assert again.status_code == 409, again.text

    def test_credit_choice(self, api):
        _, tx_id = make_cancelled_booking(api)
        r = api.post(f"{BASE_URL}/api/clinics/transactions/{tx_id}/choice", json={"choice": "credit"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["choice"] == "credit"
        assert d["priorityPass"]["id"]
        get = api.get(f"{BASE_URL}/api/clinics/transactions/{tx_id}")
        assert get.status_code == 200
        assert get.json()["transaction"]["creditIssuedPassId"] == d["priorityPass"]["id"]
