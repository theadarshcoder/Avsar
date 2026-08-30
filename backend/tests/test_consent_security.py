"""Security-hardening tests: consentText / consentGivenAt are server-authoritative.

No matter what the client sends, the stored consentText must equal
render_consent_text(clinic.name) and consentGivenAt must be a fresh
server timestamp.
"""
import os
from datetime import datetime, timezone

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

CLINIC_ID = "clinic_smile_dental_indiranagar"
EXPECTED = (
    "I agree to receive WhatsApp notifications about last-minute appointment "
    "openings at Smile Dental, Indiranagar. No prices will be included in messages."
)


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "X-Doctro-Test-Override": os.environ.get("MOCK_OVERRIDE_TOKEN", "doctro-testing-override"),
    })
    return s


def _find_row(api, entry_id):
    rows = api.get(f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist").json()
    return next((r for r in rows if r["id"] == entry_id), None)


def _cleanup(api, entry_id):
    api.delete(f"{BASE_URL}/api/clinics/waitlist/{entry_id}")


class TestConsentServerAuthoritative:
    # Test 1: forged consentText on add
    def test_forged_consent_text_on_add_is_ignored(self, api):
        r = api.post(
            f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist",
            json={
                "name": "TEST_Forge Test A",
                "phone": "+919000012345",
                "consentGiven": True,
                "consentText": "FORGED — please ignore",
            },
        )
        assert r.status_code == 200, r.text
        entry = r.json()["waitlistEntry"]
        eid = entry["id"]
        try:
            assert entry["consentText"] == EXPECTED
            assert "FORGED" not in (entry["consentText"] or "")
            dt = datetime.fromisoformat(entry["consentGivenAt"])
            assert abs((datetime.now(timezone.utc) - dt).total_seconds()) < 120
            row = _find_row(api, eid)
            assert row is not None
            assert row["consentText"] == EXPECTED
            assert row["consentGivenAt"] is not None
        finally:
            _cleanup(api, eid)

    # Test 2: forged consentText on record-consent endpoint
    def test_forged_consent_text_on_record_consent_is_ignored(self, api):
        r = api.post(
            f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist",
            json={"name": "TEST_Later Consent B", "phone": "+919000012399", "consentGiven": False},
        )
        assert r.status_code == 200, r.text
        entry = r.json()["waitlistEntry"]
        eid = entry["id"]
        try:
            assert entry["consentText"] is None
            assert entry["consentGivenAt"] is None
            c = api.post(
                f"{BASE_URL}/api/clinics/waitlist/{eid}/consent",
                json={"consentText": "another-forgery"},
            )
            assert c.status_code == 200, c.text
            assert c.json()["consentText"] == EXPECTED
            row = _find_row(api, eid)
            assert row["consentText"] == EXPECTED
            assert row["consentGivenAt"] is not None
        finally:
            _cleanup(api, eid)

    # Test 3: record consent with no body / empty body
    @pytest.mark.parametrize("mode", ["nobody", "empty"])
    def test_record_consent_without_body(self, api, mode):
        phone = "+91900001236" + ("1" if mode == "nobody" else "2")
        r = api.post(
            f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist",
            json={"name": f"TEST_NoBody {mode}", "phone": phone, "consentGiven": False},
        )
        assert r.status_code == 200, r.text
        eid = r.json()["waitlistEntry"]["id"]
        try:
            url = f"{BASE_URL}/api/clinics/waitlist/{eid}/consent"
            c = api.post(url) if mode == "nobody" else api.post(url, json={})
            assert c.status_code == 200, c.text
            assert c.json()["consentText"] == EXPECTED
            assert _find_row(api, eid)["consentText"] == EXPECTED
        finally:
            _cleanup(api, eid)

    # Test 4: forged (backdated) consentGivenAt is ignored
    def test_forged_consent_given_at_is_ignored(self, api):
        r = api.post(
            f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist",
            json={
                "name": "TEST_Backdate C",
                "phone": "+919000012350",
                "consentGiven": True,
                "consentText": "ok",
                "consentGivenAt": "1970-01-01T00:00:00+00:00",
            },
        )
        assert r.status_code == 200, r.text
        entry = r.json()["waitlistEntry"]
        eid = entry["id"]
        try:
            assert entry["consentText"] == EXPECTED
            assert not entry["consentGivenAt"].startswith("1970")
            dt = datetime.fromisoformat(entry["consentGivenAt"])
            assert abs((datetime.now(timezone.utc) - dt).total_seconds()) < 120
            row = _find_row(api, eid)
            assert not row["consentGivenAt"].startswith("1970")
        finally:
            _cleanup(api, eid)

    # Test 5: double consent is 409
    def test_double_consent_conflict(self, api):
        r = api.post(
            f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist",
            json={"name": "TEST_Double D", "phone": "+919000012351", "consentGiven": False},
        )
        eid = r.json()["waitlistEntry"]["id"]
        try:
            assert api.post(f"{BASE_URL}/api/clinics/waitlist/{eid}/consent").status_code == 200
            assert api.post(f"{BASE_URL}/api/clinics/waitlist/{eid}/consent").status_code == 409
        finally:
            _cleanup(api, eid)


class TestWaitlistRegressions:
    def test_seeded_counts(self, api):
        rows = api.get(f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist").json()
        seeded = [r for r in rows if not (r.get("patientName") or "").startswith("TEST_")]
        consented = [r for r in seeded if r["consentGivenAt"]]
        assert len(consented) == 4, [r["patientName"] for r in consented]
        assert len(seeded) - len(consented) == 2

    def test_all_consented_rows_use_server_template(self, api):
        rows = api.get(f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist").json()
        for r in rows:
            if r["consentGivenAt"]:
                assert r["consentText"] == EXPECTED, r

    def test_broadcast_seeded_slot(self, api):
        # Counted relative to the seeded rows so the parallel workers'
        # TEST_ rows cannot make this flaky. Seeded truth: 4 consented,
        # 1 of which has a phone ending 0000 (forced failure hook).
        rows = api.get(f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist").json()
        seeded = [r for r in rows if not (r.get("patientName") or "").startswith("TEST_")]
        seeded_consented = [r for r in seeded if r["consentGivenAt"]]
        seeded_failing = [r for r in seeded_consented if (r["phone"] or "").endswith("0000")]
        assert len(seeded_consented) == 4
        assert len(seeded_failing) == 1
        res = api.post(f"{BASE_URL}/api/clinics/slots/slot_today_1000/open")
        assert res.status_code == 200, res.text
        d = res.json()
        seeded_sent = [o for o in d["outbox"]
                       if not (o.get("patientName") or "").startswith("TEST_")]
        assert len([o for o in seeded_sent if o["status"] == "sent"]) == 3, d
        assert len([o for o in seeded_sent if o["status"] == "failed"]) == 1, d
        assert d["failed"] >= 1

    def test_duplicate_phone_409(self, api):
        r = api.post(
            f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist",
            json={"name": "TEST_Dup E", "phone": "+919000012377", "consentGiven": True},
        )
        eid = r.json()["waitlistEntry"]["id"]
        try:
            dup = api.post(
                f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist",
                json={"name": "TEST_Dup E2", "phone": "+919000012377", "consentGiven": False},
            )
            assert dup.status_code == 409, dup.text
        finally:
            _cleanup(api, eid)

    def test_readd_after_remove_has_null_consent(self, api):
        payload = {"name": "TEST_Readd F", "phone": "+919000012388", "consentGiven": True}
        r1 = api.post(f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist", json=payload)
        eid1 = r1.json()["waitlistEntry"]["id"]
        _cleanup(api, eid1)
        r2 = api.post(
            f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist",
            json={"name": "TEST_Readd F", "phone": "+919000012388", "consentGiven": False},
        )
        assert r2.status_code == 200, r2.text
        e2 = r2.json()["waitlistEntry"]
        try:
            assert e2["id"] != eid1
            assert e2["consentGivenAt"] is None
            assert e2["consentText"] is None
        finally:
            _cleanup(api, e2["id"])

    def test_no_price_tokens_in_waitlist_copy(self, api):
        raw = api.get(f"{BASE_URL}/api/clinics/{CLINIC_ID}/waitlist").text
        low = raw.lower()
        assert "₹" not in raw
        assert "rupee" not in low
        assert "discount" not in low
        assert "standby rate" not in low
        # 'prices' inside the consent copy is expected; no other 'price' usage
        assert low.count("price") == low.count("prices")
