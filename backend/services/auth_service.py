"""Clinic authentication (JWT, HS256).

Single-token model (no refresh) with 24h expiry. Password hashing via
bcrypt. The clinic is embedded with `email` + `passwordHash` — simplest
shape that matches the one-clinic-one-login rule.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Header, HTTPException, status

from database import clinics

logger = logging.getLogger(__name__)


JWT_ALGORITHM = "HS256"


def _secret() -> str:
    s = os.environ.get("JWT_SECRET", "avsar_jwt_secret_dev_2026")
    return s


def _ttl_hours() -> int:
    return int(os.environ.get("JWT_TTL_HOURS", "24"))


# ── password hashing (bcrypt) ───────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:  # noqa: BLE001
        return False


# ── token encode / decode ───────────────────────────────────────────────
def issue_token(clinic_id: str, email: str) -> tuple[str, datetime]:
    exp = datetime.now(timezone.utc) + timedelta(hours=_ttl_hours())
    payload = {
        "sub": clinic_id,
        "clinicId": clinic_id,
        "email": email,
        "type": "access",
        "exp": exp,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)
    return token, exp


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token type")
    return payload


# ── FastAPI dependency ──────────────────────────────────────────────────
async def require_clinic_auth(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> dict:
    """Return the clinic doc for the caller. Raises 401 on missing/bad token
    or if the clinic no longer exists.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_token(token)
    clinic_id = payload.get("clinicId") or payload.get("sub")
    if not clinic_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing clinicId")
    clinic = await clinics.find_one({"id": clinic_id}, {"_id": 0})
    if not clinic:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Clinic no longer exists")
    # Redact hash before returning downstream.
    clinic.pop("passwordHash", None)
    return clinic


def assert_clinic_match(current_clinic: dict, target_clinic_id: str) -> None:
    """Raise 403 if the JWT belongs to a different clinic than the resource."""
    if current_clinic.get("id") != target_clinic_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Clinic mismatch for token")
