from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from config import PRIORITY_PASS_TTL_DAYS


def _default_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=PRIORITY_PASS_TTL_DAYS)


class PriorityPass(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patientId: str
    clinicId: str
    amount: int  # INR
    issuedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expiresAt: datetime = Field(default_factory=_default_expiry)
    redeemed: bool = False
    redeemedTransactionId: Optional[str] = None
    sourceTransactionId: Optional[str] = None  # the cancelled booking it came from
