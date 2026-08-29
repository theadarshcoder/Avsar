from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RefundStatus(str, Enum):
    INITIATED = "initiated"
    COMPLETED = "completed"


class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slotId: str
    patientId: str
    clinicId: str
    standardPrice: int
    standbyAdjustment: int
    handlingFee: int
    priorityPassAmount: int = 0
    priorityPassId: Optional[str] = None
    totalPaid: int
    razorpayPaymentId: Optional[str] = None
    razorpayOrderId: Optional[str] = None
    razorpayEventId: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    refundStatus: Optional[RefundStatus] = None
    # For "lost race" / "expired slot" flows the transaction is created
    # even though the slot was never locked for this patient — used to
    # track that a refund was initiated.
    lockOutcome: str = "won"  # won | lost_race | expired | duplicate
