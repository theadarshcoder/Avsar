"""Clinic-facing routes: create slot, open a scheduled slot (broadcast),
cancel a booked slot, list slots. Also patient-choice endpoint after
a clinic cancels a booked slot.

No auth in Phase 1: endpoints are keyed by clinicId.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import (
    checkout_tokens,
    clinics,
    patients,
    slots,
    transactions,
    waitlist_entries,
)
from models.checkout_token import CheckoutToken
from models.slot import Slot, SlotStatus
from services.ledger_service import initiate_refund, issue_priority_pass
from services.notification_service import (
    NotificationError,
    render_standby_body,
    send_whatsapp_message,
)
from services.waitlist_service import (
    add_patient_with_consent,
    list_enriched,
    record_consent,
    remove_entry,
)
from config import checkout_link

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/clinics", tags=["clinics"])


class ClinicCreate(BaseModel):
    name: str
    phone: str
    standbyAdjustment: int = 400
    chairs: int = 1
    averageHourlyRate: int = 0


class SlotCreate(BaseModel):
    doctorName: str
    startTime: datetime
    standardPrice: int
    status: SlotStatus = SlotStatus.SCHEDULED


class BroadcastResult(BaseModel):
    slotId: str
    slotStatus: str
    consentedPatients: int
    skippedNonConsented: int
    sent: int
    failed: int
    failures: List[dict]
    outbox: List[dict] = []  # per-consented-patient send record (drives the mock outbox UI)


@router.post("")
async def create_clinic(payload: ClinicCreate):
    doc = payload.model_dump()
    from models.clinic import Clinic

    clinic = Clinic(**doc)
    to_store = clinic.model_dump()
    if to_store.get("subscriptionExpiresAt") is None:
        to_store["subscriptionExpiresAt"] = None
    to_store["createdAt"] = clinic.createdAt.isoformat()
    await clinics.insert_one(to_store)
    return {"id": clinic.id, "clinic": {k: v for k, v in to_store.items() if k != "_id"}}


@router.get("/{clinic_id}")
async def get_clinic(clinic_id: str):
    doc = await clinics.find_one({"id": clinic_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Clinic not found")
    return doc


@router.get("/{clinic_id}/slots")
async def list_slots(clinic_id: str, status: Optional[str] = None):
    q: dict = {"clinicId": clinic_id}
    if status:
        q["status"] = status
    docs = await slots.find(q, {"_id": 0}).sort("startTime", 1).to_list(500)
    return docs


@router.post("/{clinic_id}/slots")
async def create_slot(clinic_id: str, payload: SlotCreate):
    clinic = await clinics.find_one({"id": clinic_id})
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    slot = Slot(clinicId=clinic_id, **payload.model_dump())
    to_store = slot.model_dump()
    to_store["startTime"] = slot.startTime.astimezone(timezone.utc).isoformat()
    to_store["createdAt"] = slot.createdAt.isoformat()
    to_store["status"] = slot.status.value
    to_store["lockedAt"] = None
    to_store["bookedByPatientId"] = None
    await slots.insert_one(to_store)
    return {"id": slot.id, "slot": {k: v for k, v in to_store.items() if k != "_id"}}


@router.get("/{clinic_id}/waitlist")
async def list_waitlist(clinic_id: str):
    return await list_enriched(clinic_id)


class AddPatientBody(BaseModel):
    """Request body for adding a patient to the waitlist.

    NOTE: `consentText` and `consentGivenAt` are intentionally NOT accepted.
    Both are set server-side (rendered from the clinic name, timestamped by
    the server). Any client-supplied values are ignored.
    """
    name: str
    phone: str
    notificationPreference: str = "whatsapp"
    consentGiven: bool = False


@router.post("/{clinic_id}/waitlist")
async def add_to_waitlist(clinic_id: str, payload: AddPatientBody):
    clinic = await clinics.find_one({"id": clinic_id})
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    return await add_patient_with_consent(
        clinic_id=clinic_id,
        name=payload.name,
        phone=payload.phone,
        notification_preference=payload.notificationPreference,
        consent_given=payload.consentGiven,
    )


@router.post("/waitlist/{entry_id}/consent")
async def record_waitlist_consent(entry_id: str):
    """Record consent for an existing entry. No body — the text is rendered
    server-side from the clinic's name, and the timestamp comes from the
    server. Client-supplied text is intentionally not accepted."""
    return await record_consent(entry_id)


@router.delete("/waitlist/{entry_id}")
async def remove_waitlist_entry(entry_id: str):
    await remove_entry(entry_id)
    return {"deleted": entry_id}


def _format_time(dt: datetime) -> str:
    # Present as e.g. "3:00 PM". Do NOT include the date to keep the
    # template short and reflect the "today" wording.
    return dt.strftime("%-I:%M %p") if hasattr(dt, "strftime") else str(dt)


@router.post("/slots/{slot_id}/open", response_model=BroadcastResult)
async def open_slot_and_broadcast(slot_id: str):
    """Clinic cancels/opens a scheduled slot -> broadcast to consented waitlist.

    Failure isolation: one bad send never stops the rest of the broadcast.
    """
    slot = await slots.find_one({"id": slot_id})
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot["status"] in (SlotStatus.BOOKED.value, SlotStatus.LOCKED.value):
        raise HTTPException(
            409,
            "Slot is already booked/locked. Use /slots/{id}/cancel-booked to cancel a paid booking.",
        )

    await slots.update_one(
        {"id": slot_id},
        {"$set": {"status": SlotStatus.OPEN.value, "lockedAt": None, "bookedByPatientId": None}},
    )
    slot["status"] = SlotStatus.OPEN.value

    # Only consented entries — enforced at query level.
    consented_cursor = waitlist_entries.find(
        {"clinicId": slot["clinicId"], "consentGivenAt": {"$ne": None}}
    )
    consented = await consented_cursor.to_list(1000)

    total_waitlist = await waitlist_entries.count_documents({"clinicId": slot["clinicId"]})
    skipped_non_consented = total_waitlist - len(consented)

    sent_count = 0
    failed_count = 0
    failures: List[dict] = []
    outbox: List[dict] = []

    # Parse start time back to datetime for template rendering.
    start_dt = slot["startTime"]
    if isinstance(start_dt, str):
        start_dt = datetime.fromisoformat(start_dt.replace("Z", "+00:00"))
    time_str = _format_time(start_dt)

    for entry in consented:
        patient = await patients.find_one({"id": entry["patientId"]}, {"_id": 0})
        if not patient:
            failed_count += 1
            failures.append({"waitlistId": entry["id"], "error": "patient missing"})
            continue

        # Fresh checkout token per (slot, patient).
        tok = CheckoutToken(
            slotId=slot_id, patientId=patient["id"], clinicId=slot["clinicId"]
        )
        tok_doc = tok.model_dump()
        tok_doc["createdAt"] = tok.createdAt.isoformat()
        await checkout_tokens.insert_one(tok_doc)
        link = checkout_link(tok.token)

        body = render_standby_body(time_str, slot["doctorName"], link)
        try:
            await send_whatsapp_message(
                to_phone=patient["phone"],
                body=body,
                template_name="standby_open_slot",
                patient_id=patient["id"],
                clinic_id=slot["clinicId"],
                slot_id=slot_id,
            )
            sent_count += 1
            outbox.append({
                "patientId": patient["id"],
                "patientName": patient["name"],
                "phone": patient["phone"],
                "token": tok.token,
                "checkoutLink": link,
                "status": "sent",
                "error": None,
            })
            # Clear stale error on success.
            await waitlist_entries.update_one(
                {"id": entry["id"]}, {"$set": {"lastNotificationError": None}}
            )
        except NotificationError as exc:  # ISOLATE FAILURES — keep going
            failed_count += 1
            failures.append(
                {"waitlistId": entry["id"], "phone": patient["phone"], "error": str(exc)}
            )
            outbox.append({
                "patientId": patient["id"],
                "patientName": patient["name"],
                "phone": patient["phone"],
                "token": tok.token,
                "checkoutLink": link,
                "status": "failed",
                "error": str(exc),
            })
            await waitlist_entries.update_one(
                {"id": entry["id"]}, {"$set": {"lastNotificationError": str(exc)}}
            )
        except Exception as exc:  # noqa: BLE001 - defensive: any other error
            failed_count += 1
            failures.append(
                {"waitlistId": entry["id"], "phone": patient["phone"], "error": repr(exc)}
            )
            await waitlist_entries.update_one(
                {"id": entry["id"]}, {"$set": {"lastNotificationError": repr(exc)}}
            )

    return BroadcastResult(
        slotId=slot_id,
        slotStatus=SlotStatus.OPEN.value,
        consentedPatients=len(consented),
        skippedNonConsented=skipped_non_consented,
        sent=sent_count,
        failed=failed_count,
        failures=failures,
        outbox=outbox,
    )


@router.get("/{clinic_id}/stats/today")
async def clinic_stats_today(clinic_id: str):
    """Sum of totalPaid across today's WON standby transactions for this clinic."""
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    q = {
        "clinicId": clinic_id,
        "lockOutcome": "won",
        "createdAt": {"$gte": start_of_day.isoformat()},
    }
    docs = await transactions.find(q, {"_id": 0}).to_list(500)
    total = sum(int(t.get("totalPaid", 0)) for t in docs)
    return {
        "clinicId": clinic_id,
        "todayRevenue": total,
        "bookedCount": len(docs),
    }


@router.get("/slots/{slot_id}/outbox")
async def slot_outbox(slot_id: str):
    """Reload-friendly outbox for a slot: joins sent_messages + checkout_tokens.

    This is the "Mock WhatsApp outbox" surface for the dashboard so the demo
    driver can still click through after refreshing the page.
    """
    from database import sent_messages
    slot = await slots.find_one({"id": slot_id}, {"_id": 0})
    if not slot:
        raise HTTPException(404, "Slot not found")
    msgs = await sent_messages.find(
        {"slotId": slot_id, "templateName": "standby_open_slot"}, {"_id": 0}
    ).sort("sentAt", 1).to_list(500)
    toks = await checkout_tokens.find({"slotId": slot_id}, {"_id": 0}).to_list(500)
    tok_by_patient = {t["patientId"]: t["token"] for t in toks}

    out: List[dict] = []
    for m in msgs:
        pid = m.get("patientId")
        patient = await patients.find_one({"id": pid}, {"_id": 0}) if pid else None
        token = tok_by_patient.get(pid)
        out.append({
            "patientId": pid,
            "patientName": patient["name"] if patient else None,
            "phone": m.get("toPhone"),
            "token": token,
            "checkoutLink": checkout_link(token) if token else None,
            "status": m.get("status"),
            "error": m.get("error"),
            "sentAt": m.get("sentAt"),
        })
    return {"slot": slot, "outbox": out}


@router.get("/transactions/{tx_id}")
async def get_transaction(tx_id: str):
    txn = await transactions.find_one({"id": tx_id}, {"_id": 0})
    if not txn:
        raise HTTPException(404, "Transaction not found")
    slot = await slots.find_one({"id": txn["slotId"]}, {"_id": 0})
    patient = await patients.find_one({"id": txn["patientId"]}, {"_id": 0})
    clinic = await clinics.find_one({"id": txn["clinicId"]}, {"_id": 0})
    return {"transaction": txn, "slot": slot, "patient": patient, "clinic": clinic}


class CancelChoice(BaseModel):
    choice: Literal["refund", "credit"]


@router.post("/slots/{slot_id}/cancel-booked")
async def cancel_booked_slot(slot_id: str):
    """Clinic cancels a slot the patient has ALREADY PAID FOR.

    The response returns the transaction the patient should be offered a
    refund/credit choice for. The backend does NOT auto-convert to credit.
    """
    slot = await slots.find_one({"id": slot_id})
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot["status"] != SlotStatus.BOOKED.value:
        raise HTTPException(409, f"Slot is not booked (status={slot['status']})")

    await slots.update_one(
        {"id": slot_id}, {"$set": {"status": SlotStatus.CANCELLED_BY_CLINIC.value}}
    )

    # Find the winning transaction for this slot.
    txn = await transactions.find_one(
        {"slotId": slot_id, "lockOutcome": "won"}, {"_id": 0}
    )
    slot_out = {k: v for k, v in slot.items() if k != "_id"}
    slot_out["status"] = SlotStatus.CANCELLED_BY_CLINIC.value
    if not txn:
        return {
            "slot": slot_out,
            "transaction": None,
            "message": "Slot cancelled. No paid transaction found for it.",
        }
    return {
        "slot": slot_out,
        "transaction": txn,
        "message": "Slot cancelled. Patient must be offered BOTH refund and credit — call /transactions/{txId}/choice.",
    }


@router.post("/transactions/{tx_id}/choice")
async def choose_refund_or_credit(tx_id: str, payload: CancelChoice):
    txn = await transactions.find_one({"id": tx_id}, {"_id": 0})
    if not txn:
        raise HTTPException(404, "Transaction not found")

    slot = await slots.find_one({"id": txn["slotId"]}, {"_id": 0})
    if not slot or slot["status"] != SlotStatus.CANCELLED_BY_CLINIC.value:
        raise HTTPException(
            409, "Choice is only available on a slot cancelled by the clinic."
        )

    if txn.get("refundStatus") or txn.get("creditIssuedPassId"):
        raise HTTPException(409, "Refund or credit already processed for this transaction.")

    amount = int(txn["totalPaid"])
    if payload.choice == "refund":
        refund_id = await initiate_refund(tx_id, amount)
        return {"choice": "refund", "refundId": refund_id, "amount": amount}
    else:
        pp = await issue_priority_pass(
            patient_id=txn["patientId"],
            clinic_id=txn["clinicId"],
            amount=amount,
            source_transaction_id=tx_id,
        )
        await transactions.update_one(
            {"id": tx_id}, {"$set": {"creditIssuedPassId": pp["id"]}}
        )
        return {"choice": "credit", "priorityPass": pp}
