from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WaitlistEntry(BaseModel):
    """A patient's opt-in record for a clinic's standby list.

    consentGivenAt MUST be non-null for the patient to receive any
    standby notification. This is enforced at the query level in the
    notification broadcast service.
    """

    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patientId: str
    clinicId: str
    consentGivenAt: Optional[datetime] = None
    consentText: Optional[str] = None
    notificationPreference: str = "whatsapp"  # whatsapp | sms | none
    lastNotificationError: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
