from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Clinic(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    subscriptionStatus: str = "active"  # active | trial | expired
    subscriptionExpiresAt: Optional[datetime] = None
    chairs: int = 1
    averageHourlyRate: int = 0  # informational, in INR
    standbyAdjustment: int = 400  # INR discount applied to standby price
    trialSlotLimit: int = 10
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
