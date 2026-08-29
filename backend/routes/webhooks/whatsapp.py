"""Inbound WhatsApp webhook — Phase 1 mock.

We do not receive inbound WhatsApp messages yet. Left as a stub so the
route surface matches the architecture described in the spec.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks/whatsapp", tags=["webhooks"])


# MOCK: replace with WhatsApp Business API inbound webhook — needs WABA config.
@router.post("")
async def whatsapp_inbound(request: Request):
    body = {}
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001
        pass
    logger.info("Inbound WhatsApp webhook (MOCK) payload=%s", body)
    return {"status": "received", "mock": True}
