"""WhatsApp notification service (mocked for Phase 1).

Rules enforced here:
  * Never include price/discount/standby rate in any template.
  * A test hook: phone numbers ending in "0000" simulate a send failure
    so failure-isolation can be verified.
  * All sends are logged to the `sent_messages` collection.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from database import sent_messages

logger = logging.getLogger(__name__)


class NotificationError(Exception):
    """Raised when the (mocked) WhatsApp send fails."""


# MOCK: replace with WhatsApp Business API call — needs WABA credentials.
async def send_whatsapp_message(
    to_phone: str,
    body: str,
    *,
    template_name: str,
    patient_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    slot_id: Optional[str] = None,
) -> str:
    """Send a WhatsApp message. Returns a mock message id on success.

    Test hook: any phone ending in "0000" raises NotificationError to
    exercise failure-isolation code paths. Every attempted send — success
    OR failure — is logged to `sent_messages` for verification.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "toPhone": to_phone,
        "body": body,
        "templateName": template_name,
        "patientId": patient_id,
        "clinicId": clinic_id,
        "slotId": slot_id,
        "sentAt": now_iso,
        "status": "sent",
        "providerMessageId": None,
        "error": None,
    }

    if to_phone.endswith("0000"):
        doc["status"] = "failed"
        doc["error"] = "MOCK provider rejected number ending in 0000"
        await sent_messages.insert_one(doc)
        logger.warning("Mock send failed for %s (test hook)", to_phone)
        raise NotificationError(doc["error"])

    provider_message_id = f"mock_msg_{uuid.uuid4().hex[:12]}"
    doc["providerMessageId"] = provider_message_id
    await sent_messages.insert_one(doc)
    logger.info("Mock WhatsApp sent to %s (%s)", to_phone, template_name)
    return provider_message_id


def render_standby_body(time_str: str, doctor_name: str, checkout_link: str) -> str:
    # NO price / discount / standby rate — ever.
    return (
        f"Update on your standby request: a slot opened at {time_str} today "
        f"with {doctor_name}. Review your priority status here: {checkout_link}"
    )


def render_confirmation_body(time_str: str, doctor_name: str) -> str:
    return f"Your appointment is confirmed for {time_str} with {doctor_name}. See you then."
