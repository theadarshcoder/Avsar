"""Clinic auth routes: register, login, me. All under /api/auth."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from database import clinics
from services.auth_service import (
    hash_password,
    issue_token,
    require_clinic_auth,
    verify_password,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    clinicName: str = Field(min_length=2)
    phone: str = Field(min_length=6)
    email: EmailStr
    password: str = Field(min_length=8)
    standbyAdjustment: int = 400
    chairs: int = 1


class LoginBody(BaseModel):
    email: EmailStr
    password: str


def _clinic_pub(clinic: dict) -> dict:
    return {
        "id": clinic["id"],
        "name": clinic["name"],
        "phone": clinic.get("phone"),
        "email": clinic.get("email"),
        "chairs": clinic.get("chairs", 1),
        "standbyAdjustment": clinic.get("standbyAdjustment", 400),
    }


@router.post("/register")
async def register(body: RegisterBody):
    email = body.email.lower().strip()
    existing = await clinics.find_one({"email": email})
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "A clinic with this email already exists.")

    clinic_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "id": clinic_id,
        "name": body.clinicName.strip(),
        "phone": body.phone.strip(),
        "email": email,
        "passwordHash": hash_password(body.password),
        "subscriptionStatus": "trial",
        "subscriptionExpiresAt": None,
        "chairs": body.chairs,
        "averageHourlyRate": 0,
        "standbyAdjustment": body.standbyAdjustment,
        "trialSlotLimit": 10,
        "createdAt": now.isoformat(),
    }
    await clinics.insert_one(doc)
    token, exp = issue_token(clinic_id, email)
    return {
        "token": token,
        "expiresAt": exp.isoformat(),
        "clinic": _clinic_pub(doc),
    }


@router.post("/login")
async def login(body: LoginBody):
    email = body.email.lower().strip()
    clinic = await clinics.find_one({"email": email}, {"_id": 0})
    if not clinic or not clinic.get("passwordHash"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")
    if not verify_password(body.password, clinic["passwordHash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")

    token, exp = issue_token(clinic["id"], email)
    return {
        "token": token,
        "expiresAt": exp.isoformat(),
        "clinic": _clinic_pub(clinic),
    }


@router.get("/me")
async def me(current_clinic: dict = Depends(require_clinic_auth)):
    return {"clinic": _clinic_pub(current_clinic)}
