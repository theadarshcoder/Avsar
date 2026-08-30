"""Idempotent seed script for avsar Phase 1.

Creates:
  * 1 demo clinic ("Smile Dental, Indiranagar", standbyAdjustment=400)
  * 6 patients
      - 4 with consented waitlist entries (one phone ends in "0000")
      - 2 on the waitlist WITHOUT consent (consentGivenAt=None)
  * A day of slots: mix of "scheduled" + one already "booked"

Re-running the script leaves the DB in the same state (no dupes).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, time, timedelta, timezone

from database import (
    clinics,
    ensure_indexes,
    patients,
    slots,
    transactions,
    waitlist_entries,
    checkout_tokens,
    priority_passes,
    sent_messages,
)
from models.clinic import Clinic
from models.patient import Patient
from models.slot import Slot, SlotStatus
from models.waitlist import WaitlistEntry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


CLINIC_KEY_PHONE = "+919900000001"  # used as the natural key for idempotency

# Fixed IDs so seed reruns are stable and the tester's notes remain valid.
CLINIC_ID = "clinic_smile_dental_indiranagar"
PATIENT_IDS = {
    "p0": "patient_test_recipient",
    "p1": "patient_aarav",
    "p2": "patient_bhavna",
    "p3": "patient_chirag",
    "p4": "patient_disha_0000",  # phone ends in 0000 -> failure test hook
    "p5": "patient_esha_noconsent",
    "p6": "patient_farhan_noconsent",
}


PATIENT_SPECS = [
    ("p0", "Adarsh (Test Recipient)", "+919250543490", True),
    ("p1", "Aarav Rao", "+919812345671", True),
    ("p2", "Bhavna Iyer", "+919812345672", True),
    ("p3", "Chirag Kapoor", "+919812345673", True),
    ("p4", "Disha Menon", "+919812340000", True),   # 0000 test hook
    ("p5", "Esha Nair", "+919812345675", False),
    ("p6", "Farhan Qureshi", "+919812345676", False),
]

from services.waitlist_service import render_consent_text

CONSENT_TEXT = render_consent_text("Smile Dental, Indiranagar")


async def _upsert_clinic() -> str:
    from services.auth_service import hash_password

    existing = await clinics.find_one({"id": CLINIC_ID})
    if existing:
        if not existing.get("passwordHash"):
            await clinics.update_one(
                {"id": CLINIC_ID},
                {"$set": {
                    "email": "demo@smiledental.in",
                    "passwordHash": hash_password("password123"),
                }},
            )
        logger.info("Clinic already exists (id=%s)", CLINIC_ID)
        return CLINIC_ID
    clinic = Clinic(
        name="Smile Dental, Indiranagar",
        phone=CLINIC_KEY_PHONE,
        standbyAdjustment=400,
        chairs=2,
        averageHourlyRate=1500,
    )
    doc = clinic.model_dump()
    doc["id"] = CLINIC_ID
    doc["email"] = "demo@smiledental.in"
    doc["passwordHash"] = hash_password("password123")
    doc["createdAt"] = clinic.createdAt.isoformat()
    doc["subscriptionExpiresAt"] = None
    await clinics.insert_one(doc)
    logger.info("Clinic inserted with login credentials (id=%s)", CLINIC_ID)
    return CLINIC_ID


async def _upsert_patients_and_waitlist() -> None:
    now = datetime.now(timezone.utc)
    for key, name, phone, consented in PATIENT_SPECS:
        pid = PATIENT_IDS[key]
        exists = await patients.find_one({"id": pid})
        if not exists:
            p = Patient(name=name, phone=phone, clinicId=CLINIC_ID)
            doc = p.model_dump()
            doc["id"] = pid
            doc["createdAt"] = p.createdAt.isoformat()
            await patients.insert_one(doc)
            logger.info("Patient inserted (id=%s)", pid)
        # Waitlist entry (idempotent by (patientId, clinicId)).
        wl_key = {"patientId": pid, "clinicId": CLINIC_ID}
        wl_exists = await waitlist_entries.find_one(wl_key)
        if wl_exists:
            continue
        wl = WaitlistEntry(
            patientId=pid,
            clinicId=CLINIC_ID,
            consentGivenAt=now if consented else None,
            consentText=CONSENT_TEXT if consented else None,
        )
        wdoc = wl.model_dump()
        wdoc["createdAt"] = wl.createdAt.isoformat()
        wdoc["consentGivenAt"] = now.isoformat() if consented else None
        await waitlist_entries.insert_one(wdoc)
        logger.info("Waitlist entry inserted (patient=%s consented=%s)", pid, consented)


async def _upsert_slots() -> None:
    # Day = today (UTC). Two scheduled slots later today + one already booked.
    now = datetime.now(timezone.utc)
    base = datetime.combine(now.date(), time(hour=10, tzinfo=timezone.utc))
    if base <= now:
        # push into future so tests can broadcast on them
        base = now + timedelta(hours=3)

    slot_specs = [
        # (fixed_id, doctor, offset_hours, price, status)
        ("slot_today_1000", "Dr. Anjali Menon",  0, 1200, SlotStatus.SCHEDULED),
        ("slot_today_1130", "Dr. Rohan Bhat",    1.5, 1500, SlotStatus.SCHEDULED),
        ("slot_today_1500", "Dr. Anjali Menon",  5, 1800, SlotStatus.BOOKED),
        ("slot_today_1630", "Dr. Rohan Bhat",    6.5, 1300, SlotStatus.SCHEDULED),
    ]

    for slot_id, doctor, offset, price, status in slot_specs:
        exists = await slots.find_one({"id": slot_id})
        if exists:
            continue
        st = base + timedelta(hours=offset)
        s = Slot(
            clinicId=CLINIC_ID,
            doctorName=doctor,
            startTime=st,
            standardPrice=price,
            status=status,
        )
        doc = s.model_dump()
        doc["id"] = slot_id
        doc["startTime"] = st.isoformat()
        doc["createdAt"] = s.createdAt.isoformat()
        doc["status"] = status.value
        # For the pre-booked slot, pin it to patient p1 so tests can find it.
        if status == SlotStatus.BOOKED:
            doc["bookedByPatientId"] = PATIENT_IDS["p1"]
            doc["lockedAt"] = s.createdAt.isoformat()
        else:
            doc["bookedByPatientId"] = None
            doc["lockedAt"] = None
        await slots.insert_one(doc)
        logger.info("Slot inserted (id=%s status=%s)", slot_id, status.value)


async def main(*, reset: bool = False) -> None:
    await ensure_indexes()
    if reset:
        logger.warning("RESET mode — dropping avsar collections")
        for c in (
            clinics,
            patients,
            waitlist_entries,
            slots,
            transactions,
            priority_passes,
            checkout_tokens,
            sent_messages,
        ):
            await c.delete_many({})
    await _upsert_clinic()
    await _upsert_patients_and_waitlist()
    await _upsert_slots()

    consented_count = await waitlist_entries.count_documents(
        {"clinicId": CLINIC_ID, "consentGivenAt": {"$ne": None}}
    )
    non_consented = await waitlist_entries.count_documents(
        {"clinicId": CLINIC_ID, "consentGivenAt": None}
    )
    logger.info(
        "SEED DONE. clinic=%s consented=%d non_consented=%d",
        CLINIC_ID,
        consented_count,
        non_consented,
    )


if __name__ == "__main__":
    import sys
    reset = "--reset" in sys.argv
    asyncio.run(main(reset=reset))
