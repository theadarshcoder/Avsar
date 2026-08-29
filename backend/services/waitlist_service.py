"""Waitlist consent + membership logic.

All timestamping is done here so the value comes from the server, not the
client. The broadcast query in routes/clinics.py is intentionally not
touched — it still filters {consentGivenAt: {$ne: None}}.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException

from database import patients, waitlist_entries
from models.patient import Patient
from models.waitlist import WaitlistEntry

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def add_patient_with_consent(
    *,
    clinic_id: str,
    name: str,
    phone: str,
    notification_preference: str,
    consent_given: bool,
    consent_text: Optional[str],
) -> dict:
    """Create a Patient + WaitlistEntry.

    If consent_given is True, consentGivenAt is set to server-now and
    consentText is stored verbatim. Otherwise both are null. Never backfill.
    """
    if not name.strip() or not phone.strip():
        raise HTTPException(400, "Name and phone are required.")
    if consent_given and not (consent_text or "").strip():
        raise HTTPException(400, "consentText is required when consent is given.")

    # Duplicate check must be based on ACTIVE waitlist membership, not on the
    # existence of a stale Patient doc. If a Patient exists but has no
    # waitlist entry at this clinic (e.g. they were previously removed),
    # reuse that Patient record instead of blocking re-registration.
    existing_patient = await patients.find_one({"clinicId": clinic_id, "phone": phone.strip()})
    if existing_patient:
        existing_wl = await waitlist_entries.find_one(
            {"patientId": existing_patient["id"], "clinicId": clinic_id}
        )
        if existing_wl:
            raise HTTPException(
                409,
                "A patient with this phone number is already on this clinic's waitlist.",
            )
        patient_id = existing_patient["id"]
        patient_name = existing_patient.get("name", name.strip())
        # Update the display name if the operator provided a new one.
        if name.strip() and name.strip() != patient_name:
            await patients.update_one(
                {"id": patient_id}, {"$set": {"name": name.strip()}}
            )
            patient_name = name.strip()
        p_doc = {**existing_patient, "name": patient_name}
        p_doc.pop("_id", None)
    else:
        p = Patient(name=name.strip(), phone=phone.strip(), clinicId=clinic_id)
        p_doc = p.model_dump()
        p_doc["createdAt"] = p.createdAt.isoformat()
        await patients.insert_one(p_doc)
        patient_id = p.id

    now_iso = _now_iso() if consent_given else None
    wl = WaitlistEntry(
        patientId=patient_id,
        clinicId=clinic_id,
        notificationPreference=notification_preference,
    )
    wl_doc = wl.model_dump()
    wl_doc["createdAt"] = wl.createdAt.isoformat()
    wl_doc["consentGivenAt"] = now_iso
    wl_doc["consentText"] = consent_text.strip() if consent_given and consent_text else None
    await waitlist_entries.insert_one(wl_doc)

    logger.info(
        "Waitlist entry created (clinic=%s patient=%s consented=%s)",
        clinic_id, patient_id, consent_given,
    )
    return {
        "patient": {k: v for k, v in p_doc.items() if k != "_id"},
        "waitlistEntry": {k: v for k, v in wl_doc.items() if k != "_id"},
    }


async def record_consent(entry_id: str, consent_text: str) -> dict:
    if not (consent_text or "").strip():
        raise HTTPException(400, "consentText is required.")

    entry = await waitlist_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(404, "Waitlist entry not found.")
    if entry.get("consentGivenAt"):
        raise HTTPException(409, "Consent is already on record for this entry.")

    now_iso = _now_iso()
    await waitlist_entries.update_one(
        {"id": entry_id},
        {"$set": {"consentGivenAt": now_iso, "consentText": consent_text.strip()}},
    )
    entry["consentGivenAt"] = now_iso
    entry["consentText"] = consent_text.strip()
    return entry


async def remove_entry(entry_id: str) -> None:
    entry = await waitlist_entries.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(404, "Waitlist entry not found.")
    await waitlist_entries.delete_one({"id": entry_id})


async def list_enriched(clinic_id: str) -> list[dict]:
    """List waitlist entries with patient identity joined for the UI."""
    entries = await waitlist_entries.find({"clinicId": clinic_id}, {"_id": 0}).to_list(1000)
    out: list[dict] = []
    for e in entries:
        p = await patients.find_one({"id": e["patientId"]}, {"_id": 0}) or {}
        out.append({
            "id": e["id"],
            "patientId": e["patientId"],
            "patientName": p.get("name"),
            "phone": p.get("phone"),
            "consentGivenAt": e.get("consentGivenAt"),
            "consentText": e.get("consentText"),
            "notificationPreference": e.get("notificationPreference"),
            "lastNotificationError": e.get("lastNotificationError"),
            "createdAt": e.get("createdAt"),
        })
    # Consented first, then by createdAt asc.
    out.sort(key=lambda r: (0 if r["consentGivenAt"] else 1, r.get("createdAt") or ""))
    return out
