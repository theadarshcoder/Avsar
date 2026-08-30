"""WhatsApp notification service supporting Twilio and Mock modes.

Rules enforced here:
  - Price, discount, and standby rate values are never included in any template.
  - Phone numbers ending in '0000' are treated as a test hook that simulates a send failure.
  - All sends (success or failure) are logged to the sent_messages collection.
  - NOTIFICATION_MODE environment variable selects between twilio and mock transport.
  - Transport logic is isolated from template logic for easy provider swaps.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

from database import sent_messages

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger(__name__)


NOTIFICATION_MODE: str = os.environ.get("NOTIFICATION_MODE", "twilio").lower()
TWILIO_ACCOUNT_SID: str = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN: str = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM: str = os.environ.get(
    "TWILIO_WHATSAPP_FROM", "whatsapp:+17372508034"
)
TWILIO_CONTENT_SID: str = os.environ.get("TWILIO_CONTENT_SID", "")


class NotificationError(Exception):
    """Raised when WhatsApp dispatch fails."""


def is_mock_mode() -> bool:
    """Returns True if mock notification mode is explicitly active or credentials are missing."""
    if NOTIFICATION_MODE == "mock":
        return True
    return not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)


def _format_whatsapp_number(phone: str) -> str:
    """Ensure phone number has 'whatsapp:' prefix and valid E.164 formatting."""
    cleaned = phone.strip()
    if not cleaned.startswith("whatsapp:"):
        if not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        return f"whatsapp:{cleaned}"
    return cleaned


async def _send_via_twilio(
    to_phone: str,
    body: str,
    *,
    content_variables: Optional[dict] = None,
) -> str:
    """Send WhatsApp message using Twilio Messages REST API via async httpx."""
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN):
        raise NotificationError(
            "Twilio credentials missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
        )

    from_number = _format_whatsapp_number(TWILIO_WHATSAPP_FROM)
    to_number = _format_whatsapp_number(to_phone)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"

    data = {
        "From": from_number,
        "To": to_number,
    }

    # If a Twilio Content Template SID is provided, send via ContentSid + ContentVariables
    if TWILIO_CONTENT_SID:
        data["ContentSid"] = TWILIO_CONTENT_SID
        if content_variables:
            data["ContentVariables"] = json.dumps(content_variables)
    else:
        # Standard free-form / Sandbox message body
        data["Body"] = body

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                data=data,
            )
    except Exception as ex:
        logger.exception("HTTP error connecting to Twilio: %s", ex)
        raise NotificationError(f"Twilio network error: {ex}") from ex

    if resp.status_code not in (200, 201):
        try:
            err_json = resp.json()
            err_msg = err_json.get("message") or resp.text
            err_code = err_json.get("code")
        except Exception:
            err_msg = resp.text
            err_code = None

        logger.warning(
            "Twilio API error HTTP %s (code=%s): %s",
            resp.status_code,
            err_code,
            err_msg,
        )
        raise NotificationError(f"Twilio WhatsApp error ({resp.status_code}): {err_msg}")

    resp_data = resp.json()
    sid = resp_data.get("sid") or f"twilio_{uuid.uuid4().hex[:12]}"
    logger.info("Twilio WhatsApp message sent successfully: %s to %s", sid, to_phone)
    return sid


async def send_whatsapp_message(
    to_phone: str,
    body: str,
    *,
    template_name: str,
    patient_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    slot_id: Optional[str] = None,
    content_variables: Optional[dict] = None,
) -> str:
    """Send a WhatsApp message via Twilio (or mock provider).

    Test hook: any phone ending in '0000' raises NotificationError to
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
        "provider": "mock" if is_mock_mode() else "twilio",
        "providerMessageId": None,
        "error": None,
    }

    # Test hook: simulated failure for phones ending in 0000
    if to_phone.endswith("0000"):
        doc["status"] = "failed"
        doc["error"] = "MOCK provider rejected number ending in 0000"
        await sent_messages.insert_one(doc)
        logger.warning("Mock send failed for %s (test hook)", to_phone)
        raise NotificationError(doc["error"])

    # Mock mode send
    if is_mock_mode():
        provider_message_id = f"mock_msg_{uuid.uuid4().hex[:12]}"
        doc["providerMessageId"] = provider_message_id
        await sent_messages.insert_one(doc)
        logger.info("Mock WhatsApp sent to %s (%s)", to_phone, template_name)
        return provider_message_id

    # Real Twilio transport send
    try:
        provider_message_id = await _send_via_twilio(
            to_phone, body, content_variables=content_variables
        )
        doc["providerMessageId"] = provider_message_id
        doc["status"] = "sent"
        await sent_messages.insert_one(doc)
        return provider_message_id
    except NotificationError as ex:
        doc["status"] = "failed"
        doc["error"] = str(ex)
        await sent_messages.insert_one(doc)
        raise
    except Exception as ex:
        doc["status"] = "failed"
        doc["error"] = f"Unexpected delivery failure: {ex}"
        await sent_messages.insert_one(doc)
        raise NotificationError(doc["error"]) from ex


def render_standby_body(time_str: str, doctor_name: str, checkout_link: str) -> str:
    # NO price / discount / standby rate — ever.
    return (
        f"Update on your standby request: a slot opened at {time_str} today "
        f"with {doctor_name}. Review your priority status here: {checkout_link}"
    )


def render_confirmation_body(time_str: str, doctor_name: str) -> str:
    return f"Your appointment is confirmed for {time_str} with {doctor_name}. See you then."
