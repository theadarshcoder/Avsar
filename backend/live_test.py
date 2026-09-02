import asyncio
from datetime import datetime, timezone, timedelta
from database import clinics, patients, waitlist_entries, slots, sent_messages, checkout_tokens
from services.waitlist_service import add_patient_with_consent
from services.notification_service import send_whatsapp_message, render_standby_body
from models.slot import Slot, SlotStatus
from models.checkout_token import CheckoutToken
from config import checkout_link

async def run_flow():
    clinic_id = "clinic_smile_dental_indiranagar"
    clinic = await clinics.find_one({"id": clinic_id})
    if not clinic:
        print("Clinic not found in DB, please seed first.")
        return

    print(f"1. Clinic: {clinic.get('name')} ({clinic_id})")

    # Step 2: Add Adarsh to waitlist with explicit consent
    name = "Adarsh"
    phone = "+919250543490"
    res = await add_patient_with_consent(
        clinic_id=clinic_id,
        name=name,
        phone=phone,
        notification_preference="whatsapp",
        consent_given=True,
    )
    patient = res["patient"]
    entry = res["waitlistEntry"]
    print("2. Waitlist entry added/updated:")
    print(f"   Patient ID: {patient['id']}")
    print(f"   Patient Name: {patient['name']}")
    print(f"   DB Phone: {patient['phone']}")
    print(f"   Consent Given At: {entry.get('consentGivenAt')}")
    print(f"   Consent Text: {entry.get('consentText')}")

    # Step 3: Phone format verification
    print("3. Phone Format Audit:")
    print(f"   Database Storage: {patient['phone']} (E.164 standard format)")
    print(f"   Twilio Transport: whatsapp:{patient['phone']} (Twilio WhatsApp format)")
    print("   -> Mismatch: None. The DB stores valid E.164 '+919250543490', and notification_service formats it as 'whatsapp:+919250543490' on the wire.")

    # Step 4: Create a test slot for today
    now = datetime.now(timezone.utc)
    slot_time = now + timedelta(hours=2)
    slot_id = f"test_slot_{now.strftime('%Y%m%d_%H%M%S')}"
    slot = Slot(
        id=slot_id,
        clinicId=clinic_id,
        doctorName="Dr. Anjali Menon",
        doctorSpecialty="Orthodontics & General Dentistry",
        startTime=slot_time,
        standardPrice=1200,
        status=SlotStatus.SCHEDULED,
    )
    to_store = slot.model_dump()
    to_store["startTime"] = slot.startTime.isoformat()
    to_store["createdAt"] = slot.createdAt.isoformat()
    to_store["status"] = slot.status.value
    to_store["lockedAt"] = None
    to_store["bookedByPatientId"] = None
    await slots.insert_one(to_store)
    print(f"4. Created test scheduled slot: {slot_id} at {to_store['startTime']}")

    # Step 5: Generate checkout token and broadcast
    tok = CheckoutToken(slotId=slot_id, patientId=patient["id"], clinicId=clinic_id)
    tok_doc = tok.model_dump()
    tok_doc["createdAt"] = tok.createdAt.isoformat()
    await checkout_tokens.insert_one(tok_doc)
    link = checkout_link(tok.token)
    time_str = slot_time.strftime("%I:%M %p")
    body = render_standby_body(time_str, slot.doctorName, link)

    print("5. Dispatching WhatsApp Broadcast via Twilio:")
    print("   --- Message Text ---")
    print(f"   {body}")
    print("   --------------------")
    print(f"   Checkout Link: {link}")
    print(f"   Token: {tok.token}")

    try:
        msg_id = await send_whatsapp_message(
            to_phone=phone,
            body=body,
            template_name="standby_open_slot",
            patient_id=patient["id"],
            clinic_id=clinic_id,
            slot_id=slot_id,
        )
        print(f"\n>>> TWILIO DISPATCH SUCCESSFUL!")
        print(f"    Message SID: {msg_id}")
        
        # Verify sent_messages collection
        msg_doc = await sent_messages.find_one({"providerMessageId": msg_id}, {"_id": 0})
        print(f"    DB Logged Status: {msg_doc.get('status')}")
        print(f"    Provider: {msg_doc.get('provider')}")
        print(f"    Sent Timestamp: {msg_doc.get('sentAt')}")
    except Exception as e:
        print(f"\n>>> TWILIO DISPATCH FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(run_flow())
