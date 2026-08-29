"""Pricing math for standby slots.

BUSINESS RULES (do not "improve"):
  standbyPrice = standardPrice - standbyAdjustment + handlingFee
  handlingFee is a FIXED rupee amount (config.HANDLING_FEE). NEVER a percentage.
  standbyAdjustment comes from the clinic's setting.
  If an unredeemed non-expired PriorityPass exists for the patient+clinic,
  its amount is deducted from the total, floored at 0.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from config import HANDLING_FEE
from database import priority_passes


@dataclass
class PriceBreakdown:
    standardPrice: int
    standbyAdjustment: int
    handlingFee: int
    subtotal: int          # standard - adjustment + fee
    priorityPassAmount: int
    priorityPassId: Optional[str]
    total: int             # subtotal - priorityPassAmount, floored at 0

    def to_dict(self) -> dict:
        return {
            "standardPrice": self.standardPrice,
            "standbyAdjustment": self.standbyAdjustment,
            "handlingFee": self.handlingFee,
            "subtotal": self.subtotal,
            "priorityPassAmount": self.priorityPassAmount,
            "priorityPassId": self.priorityPassId,
            "total": self.total,
        }


async def _find_active_pass(patient_id: str, clinic_id: str) -> Optional[dict]:
    now_iso = datetime.now(timezone.utc).isoformat()
    return await priority_passes.find_one(
        {
            "patientId": patient_id,
            "clinicId": clinic_id,
            "redeemed": False,
            "expiresAt": {"$gt": now_iso},
        }
    )


async def compute_price(
    standard_price: int,
    standby_adjustment: int,
    patient_id: str,
    clinic_id: str,
) -> PriceBreakdown:
    subtotal = standard_price - standby_adjustment + HANDLING_FEE
    if subtotal < 0:
        subtotal = 0

    pp = await _find_active_pass(patient_id, clinic_id)
    pass_amount = int(pp["amount"]) if pp else 0
    pass_id = pp["id"] if pp else None

    total = max(0, subtotal - pass_amount)
    return PriceBreakdown(
        standardPrice=standard_price,
        standbyAdjustment=standby_adjustment,
        handlingFee=HANDLING_FEE,
        subtotal=subtotal,
        priorityPassAmount=pass_amount,
        priorityPassId=pass_id,
        total=total,
    )
