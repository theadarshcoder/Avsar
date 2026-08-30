"""Backend tests for the WAITLIST MANAGEMENT + CONSENT CAPTURE phase.

Modules under test:
  - routes/clinics.py  (waitlist routes + open_slot_and_broadcast)
  - services/waitlist_service.py
  - routes/slots.py    (GET /api/slots/{id}/messages)
"""
import os
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

SEED_CLINIC = "clinic_smile_dental_indiranagar"


def consent_text_for(clinic_name):
    return (
        f"I agree to receive WhatsApp notifications about last-minute appointment "
        f"openings at {clinic_name}. No prices will be included in messages."
    )


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "X-Doctro-Test-Override": os.environ.get("MOCK_OVERRIDE_TOKEN", "doctro-testing-override"),
    })
    return s


@pytest.fixture(scope="session")
def temp_clinic(api):
    """Isolated clinic so broadcasts don't consume the seeded demo slots."""
    r = api.post(f"{API}/clinics", json={
        "name": "TEST_Waitlist Clinic",
        "phone": "+919000000123",
        "standbyAdjustment": 400,
        "chairs": 1,
        "averageHourlyRate": 1000,
    })
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    yield cid


def _make_slot(api, clinic_id, hours=2):
    start = (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()
    r = api.post(f"{API}/clinics/{clinic_id}/slots", json={
        "doctorName": "Dr. TEST",
        "startTime": start,
        "standardPrice": 1200,
        "status": "scheduled",
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


# --- seeded state ------------------------------------------------------------
class TestSeededWaitlist:
    def test_seeded_waitlist_shape(self, api):
        r = api.get(f"{API}/clinics/{SEED_CLINIC}/waitlist")
        assert r.status_code == 200, r.text
        rows = r.json()
        assert isinstance(rows, list)
        consented = [x for x in rows if x["consentGivenAt"]]
        non = [x for x in rows if not x["consentGivenAt"]]
        assert len(consented) == 4, [x["patientName"] for x in consented]
        assert len(non) == 2, [x["patientName"] for x in non]
        names = {x["patientName"] for x in non}
        assert names == {"Esha Nair", "Farhan Qureshi"}
        # enrichment + no mongo _id leak
        for row in rows:
            assert "_id" not in row
            assert row["patientName"]
            assert row["phone"]
            assert row["patientId"]
        # consented rows sort first
        assert bool(rows[0]["consentGivenAt"]) is True
        assert bool(rows[-1]["consentGivenAt"]) is False

    def test_unknown_clinic_waitlist_is_empty_list(self, api):
        r = api.get(f"{API}/clinics/TEST_does_not_exist/waitlist")
        assert r.status_code == 200
        assert r.json() == []


# --- add patient / consent / remove -----------------------------------------
class TestWaitlistCrud:
    def test_add_without_consent_then_consent_then_remove(self, api, temp_clinic):
        clinic_name = "TEST_Waitlist Clinic"
        phone = "+919000000901"
        r = api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "TEST_NoConsent",
            "phone": phone,
            "notificationPreference": "whatsapp",
            "consentGiven": False,
            "consentText": None,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        entry = body["waitlistEntry"]
        assert entry["consentGivenAt"] is None
        assert entry["consentText"] is None
        entry_id = entry["id"]

        # persisted via GET
        rows = api.get(f"{API}/clinics/{temp_clinic}/waitlist").json()
        row = next(x for x in rows if x["id"] == entry_id)
        assert row["consentGivenAt"] is None
        assert row["patientName"] == "TEST_NoConsent"

        # duplicate phone -> 409, no new row
        dup = api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "TEST_Dup", "phone": phone, "consentGiven": False,
        })
        assert dup.status_code == 409, dup.text
        assert "already" in dup.json()["detail"].lower()
        assert len(api.get(f"{API}/clinics/{temp_clinic}/waitlist").json()) == len(rows)

        # record consent -> server timestamp, exact text stored
        text = consent_text_for(clinic_name)
        before = datetime.now(timezone.utc)
        c = api.post(f"{API}/clinics/waitlist/{entry_id}/consent", json={"consentText": text})
        assert c.status_code == 200, c.text
        assert c.json()["consentGivenAt"]
        rows = api.get(f"{API}/clinics/{temp_clinic}/waitlist").json()
        row = next(x for x in rows if x["id"] == entry_id)
        assert row["consentText"] == text
        ts = datetime.fromisoformat(row["consentGivenAt"])
        after = datetime.now(timezone.utc)
        assert before - timedelta(seconds=5) <= ts <= after + timedelta(seconds=5)

        # second consent -> 409
        again = api.post(f"{API}/clinics/waitlist/{entry_id}/consent", json={"consentText": text})
        assert again.status_code == 409, again.text

        # remove
        d = api.delete(f"{API}/clinics/waitlist/{entry_id}")
        assert d.status_code == 200, d.text
        rows = api.get(f"{API}/clinics/{temp_clinic}/waitlist").json()
        assert all(x["id"] != entry_id for x in rows)
        assert api.delete(f"{API}/clinics/waitlist/{entry_id}").status_code == 404

    def test_add_with_consent_sets_server_timestamp(self, api, temp_clinic):
        text = consent_text_for("TEST_Waitlist Clinic")
        r = api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "TEST_WithConsent",
            "phone": "+919000000902",
            "consentGiven": True,
            "consentText": text,
        })
        assert r.status_code == 200, r.text
        entry = r.json()["waitlistEntry"]
        assert entry["consentGivenAt"] is not None
        assert entry["consentText"] == text
        datetime.fromisoformat(entry["consentGivenAt"])

    def test_consent_given_without_text_rejected(self, api, temp_clinic):
        # HARDENING: consentText is now server-authoritative. A client that
        # sends an empty (or forged) consentText no longer gets a 400 — the
        # server ignores the field and stores its own canonical text.
        r = api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "TEST_BadConsent", "phone": "+919000000903",
            "consentGiven": True, "consentText": "   ",
        })
        assert r.status_code == 200, r.text
        entry = r.json()["waitlistEntry"]
        expected = consent_text_for("TEST_Waitlist Clinic")
        assert entry["consentText"] == expected
        assert entry["consentGivenAt"] is not None

    def test_blank_name_rejected(self, api, temp_clinic):
        r = api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "   ", "phone": "+919000000904", "consentGiven": False,
        })
        assert r.status_code == 400, r.text

    def test_add_to_unknown_clinic_404(self, api):
        r = api.post(f"{API}/clinics/TEST_nope/waitlist", json={
            "name": "TEST_X", "phone": "+919000000905", "consentGiven": False,
        })
        assert r.status_code == 404

    def test_consent_unknown_entry_404(self, api):
        r = api.post(f"{API}/clinics/waitlist/TEST_nope/consent", json={"consentText": "x"})
        assert r.status_code == 404


# --- broadcast: consent gate -------------------------------------------------
class TestBroadcastConsentGate:
    def test_non_consented_never_notified_and_consent_enables_exactly_one(self, api, temp_clinic):
        text = consent_text_for("TEST_Waitlist Clinic")
        # one consented, one not
        a = api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "TEST_Consented", "phone": "+919000000911",
            "consentGiven": True, "consentText": text,
        }).json()
        b = api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "TEST_Pending", "phone": "+919000000912", "consentGiven": False,
        }).json()
        pid_pending = b["patient"]["id"]
        entry_pending = b["waitlistEntry"]["id"]
        assert a["waitlistEntry"]["consentGivenAt"]

        slot1 = _make_slot(api, temp_clinic, hours=2)
        r = api.post(f"{API}/clinics/slots/{slot1}/open")
        assert r.status_code == 200, r.text
        res = r.json()
        assert res["skippedNonConsented"] >= 1
        msgs = api.get(f"{API}/slots/{slot1}/messages").json()
        assert all(m["patientId"] != pid_pending for m in msgs), msgs

        # now consent, broadcast on a fresh slot -> exactly one message
        assert api.post(
            f"{API}/clinics/waitlist/{entry_pending}/consent", json={"consentText": text}
        ).status_code == 200
        slot2 = _make_slot(api, temp_clinic, hours=3)
        assert api.post(f"{API}/clinics/slots/{slot2}/open").status_code == 200
        msgs2 = api.get(f"{API}/slots/{slot2}/messages").json()
        mine = [m for m in msgs2 if m["patientId"] == pid_pending]
        assert len(mine) == 1, mine
        assert mine[0]["status"] == "sent"

        # remove -> no more notifications
        assert api.delete(f"{API}/clinics/waitlist/{entry_pending}").status_code == 200
        slot3 = _make_slot(api, temp_clinic, hours=4)
        assert api.post(f"{API}/clinics/slots/{slot3}/open").status_code == 200
        msgs3 = api.get(f"{API}/slots/{slot3}/messages").json()
        assert [m for m in msgs3 if m["patientId"] == pid_pending] == []

    def test_failure_isolation_0000_hook(self, api, temp_clinic):
        text = consent_text_for("TEST_Waitlist Clinic")
        api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "TEST_FailHook", "phone": "+919000000000",
            "consentGiven": True, "consentText": text,
        })
        slot = _make_slot(api, temp_clinic, hours=5)
        res = api.post(f"{API}/clinics/slots/{slot}/open").json()
        assert res["failed"] >= 1
        assert res["sent"] >= 1
        assert res["sent"] + res["failed"] == res["consentedPatients"]
        assert any("+919000000000" in str(f.get("phone")) for f in res["failures"])

    def test_no_price_tokens_in_message_body(self, api, temp_clinic):
        slot = _make_slot(api, temp_clinic, hours=6)
        api.post(f"{API}/clinics/slots/{slot}/open")
        msgs = api.get(f"{API}/slots/{slot}/messages").json()
        assert msgs
        for m in msgs:
            body = (m.get("body") or "").lower()
            for token in ["\u20b9", "rupee", "discount", "standby rate"]:
                assert token not in body, (token, body)


# --- regression on the seeded demo clinic -----------------------------------
class TestSeededBroadcastRegression:
    def test_seeded_broadcast_3_sent_1_failed(self, api):
        """Uses slot_today_1500? No — creates a fresh scheduled slot on the seeded
        clinic so the demo slots stay available for UI testing."""
        slot = _make_slot(api, SEED_CLINIC, hours=8)
        r = api.post(f"{API}/clinics/slots/{slot}/open")
        assert r.status_code == 200, r.text
        res = r.json()
        assert res["consentedPatients"] == 4, res
        assert res["skippedNonConsented"] == 2, res
        assert res["sent"] == 3, res
        assert res["failed"] == 1, res

    def test_booked_slot_cannot_be_opened(self, api):
        r = api.post(f"{API}/clinics/slots/slot_today_1500/open")
        assert r.status_code == 409, r.text


# --- fix verification: re-add after remove (iteration_3) ---------------------
class TestReAddAfterRemove:
    """Iteration 2 defect: removing an entry left an orphan Patient doc and the
    duplicate guard queried the patients collection, so the same phone could
    never be re-added (permanent 409). Guard now checks waitlist membership."""

    PHONE = "+919876543210"

    def _rows(self, api, clinic):
        return api.get(f"{API}/clinics/{clinic}/waitlist").json()

    def test_add_remove_readd_same_phone_seeded_clinic(self, api):
        baseline = self._rows(api, SEED_CLINIC)

        # (1) add
        r = api.post(f"{API}/clinics/{SEED_CLINIC}/waitlist", json={
            "name": "Priya Menon", "phone": self.PHONE, "consentGiven": False,
        })
        assert r.status_code == 200, r.text
        entry_id = r.json()["waitlistEntry"]["id"]
        rows = self._rows(api, SEED_CLINIC)
        assert len(rows) == len(baseline) + 1
        row = next(x for x in rows if x["id"] == entry_id)
        assert row["patientName"] == "Priya Menon"
        assert row["phone"] == self.PHONE
        assert row["consentGivenAt"] is None

        # regression: live duplicate still 409, counts unchanged
        dup = api.post(f"{API}/clinics/{SEED_CLINIC}/waitlist", json={
            "name": "Priya Dup", "phone": self.PHONE, "consentGiven": False,
        })
        assert dup.status_code == 409, dup.text
        assert dup.json()["detail"] == (
            "A patient with this phone number is already on this clinic's waitlist."
        )
        assert len(self._rows(api, SEED_CLINIC)) == len(baseline) + 1

        # (2) remove
        assert api.delete(f"{API}/clinics/waitlist/{entry_id}").status_code == 200
        rows = self._rows(api, SEED_CLINIC)
        assert all(x["id"] != entry_id for x in rows)
        assert len(rows) == len(baseline)

        # (3) re-add same phone, new name -> 200 (was 409)
        r2 = api.post(f"{API}/clinics/{SEED_CLINIC}/waitlist", json={
            "name": "Priya M. Second attempt", "phone": self.PHONE, "consentGiven": False,
        })
        assert r2.status_code == 200, r2.text
        e2 = r2.json()["waitlistEntry"]
        assert e2["id"] != entry_id
        assert e2["consentGivenAt"] is None
        assert e2["consentText"] is None
        rows = self._rows(api, SEED_CLINIC)
        row2 = next(x for x in rows if x["id"] == e2["id"])
        assert row2["patientName"] == "Priya M. Second attempt", row2
        assert row2["phone"] == self.PHONE
        assert row2["consentGivenAt"] is None

        # cleanup so seeded counts stay 4 consented / 2 non-consented
        assert api.delete(f"{API}/clinics/waitlist/{e2['id']}").status_code == 200
        assert len(self._rows(api, SEED_CLINIC)) == len(baseline)

    def test_readd_after_consented_removal_does_not_backfill_consent(self, api, temp_clinic):
        phone = "+919000000931"
        text = consent_text_for("TEST_Waitlist Clinic")
        first = api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "TEST_ReAdd", "phone": phone,
            "consentGiven": True, "consentText": text,
        })
        assert first.status_code == 200, first.text
        eid = first.json()["waitlistEntry"]["id"]
        assert api.delete(f"{API}/clinics/waitlist/{eid}").status_code == 200

        second = api.post(f"{API}/clinics/{temp_clinic}/waitlist", json={
            "name": "TEST_ReAdd2", "phone": phone, "consentGiven": False,
        })
        assert second.status_code == 200, second.text
        e = second.json()["waitlistEntry"]
        assert e["consentGivenAt"] is None, e
        assert e["consentText"] is None, e
        rows = api.get(f"{API}/clinics/{temp_clinic}/waitlist").json()
        row = next(x for x in rows if x["id"] == e["id"])
        assert row["consentGivenAt"] is None
        assert row["patientName"] == "TEST_ReAdd2"
        api.delete(f"{API}/clinics/waitlist/{e['id']}")


# --- cosmetic: seeded consent copy alignment --------------------------------
class TestSeededConsentCopy:
    def test_seeded_consent_text_matches_frontend_copy(self, api):
        expected = consent_text_for("Smile Dental, Indiranagar")
        rows = api.get(f"{API}/clinics/{SEED_CLINIC}/waitlist").json()
        consented = [x for x in rows if x["consentGivenAt"]]
        assert len(consented) == 4
        for row in consented:
            assert row["consentText"] == expected, row["consentText"]
