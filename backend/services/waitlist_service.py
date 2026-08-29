"""Waitlist consent + membership logic.

Both `consentGivenAt` and `consentText` are server-authoritative. The
consent copy is rendered here from the clinic's canonical name using the
same template shipped by the frontend (`/app/frontend/src/lib/consent.js`),
so the audit value of a consent record is exactly what the product shows
regardless of what any client sent in the request body.

The broadcast query in routes/clinics.py is intentionally not touched —
it still filters {consentGivenAt: {$ne: None}}.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException

from database import clinics, patients, waitlist_entries
from models.patient import Patient
from models.waitlist import WaitlistEntry

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# NOTE: keep in lock-step with /app/frontend/src/lib/consent.js. Any change
# to the wording must be made in BOTH files (Phase-1 has no shared schema
# for consent copy — the two files are the source of truth together).
def render_consent_text(clinic_name: str) -> str:
    return (
        f"I agree to receive WhatsApp notifications about last-minute "
        f"appointment openings at {clinic_name}. No prices will be included in messages."
    )


async def _consent_text_for_clinic(clinic_id: str) -> str:
    clinic = await clinics.find_one({"id": clinic_id}, {"_id": 0, "name": 1})
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    return render_consent_text(clinic["name"])


async def add_patient_with_consent(
    *,
    clinic_id: str,
    name: str,
    phone: str,
    notification_preference: str,
    consent_given: bool,
) -> dict:
    """Create a Patient + WaitlistEntry.

    If consent_given is True, both `consentGivenAt` and `consentText` are
    set server-side. `consentText` is rendered from the clinic's canonical
    name via `render_consent_text()`. **No client-supplied consent text or
    timestamp is ever honored.** Otherwise both are null. Never backfill.
    """
    if not name.strip() or not phone.strip():
        raise HTTPException(400, "Name and phone are required.")

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
    server_consent_text = await _consent_text_for_clinic(clinic_id) if consent_given else None
    wl = WaitlistEntry(
        patientId=patient_id,
        clinicId=clinic_id,
        notificationPreference=notification_preference,
    )
    wl_doc = wl.model_dump()
    wl_doc["createdAt"] = wl.createdAt.isoformat()
    wl_doc["consentGivenAt"] = now_iso
    wl_doc["consentText"] = server_consent_text
    await waitlist_entries.insert_one(wl_doc)

    logger.info(
        "Waitlist entry created (clinic=%s patient=%s consented=%s)",
        clinic_id, patient_id, consent_given,
    )
    return {
        "patient": {k: v for k, v in p_doc.items() if k != "_id"},
        "waitlistEntry": {k: v for k, v in wl_doc.items() if k != "_id"},
    }


async def record_consent(entry_id: str) -> dict:
    """Record consent server-side for an existing entry.

    Both `consentGivenAt` (server time) and `consentText` (server-rendered
    from the clinic's name) are set here. Any client-supplied text is
    ignored — the audit record must reflect what the product shows.
    """
    entry = await waitlist_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(404, "Waitlist entry not found.")
    if entry.get("consentGivenAt"):
        raise HTTPException(409, "Consent is already on record for this entry.")

    now_iso = _now_iso()
    server_consent_text = await _consent_text_for_clinic(entry["clinicId"])
    await waitlist_entries.update_one(
        {"id": entry_id},
        {"$set": {"consentGivenAt": now_iso, "consentText": server_consent_text}},
    )
    entry["consentGivenAt"] = now_iso
    entry["consentText"] = server_consent_text
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
