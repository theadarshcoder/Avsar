from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field


def _make_token() -> str:
    # URL-safe, ~32 chars, plenty of entropy for one-shot links.
    return secrets.token_urlsafe(24)


class CheckoutToken(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    token: str = Field(default_factory=_make_token)
    slotId: str
    patientId: str
    clinicId: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
