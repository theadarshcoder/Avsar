from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SlotStatus(str, Enum):
    OPEN = "open"
    LOCKED = "locked"
    BOOKED = "booked"
    SCHEDULED = "scheduled"
    CANCELLED_BY_CLINIC = "cancelled_by_clinic"


class Slot(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    clinicId: str
    doctorName: str
    startTime: datetime
    standardPrice: int  # INR, integer rupees
    status: SlotStatus = SlotStatus.SCHEDULED
    lockedAt: Optional[datetime] = None
    bookedByPatientId: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
