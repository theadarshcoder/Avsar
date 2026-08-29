"""Read-only slot inspection route (handy for tests + Phase 2 frontend)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from database import slots, transactions, sent_messages

router = APIRouter(prefix="/slots", tags=["slots"])


@router.get("/{slot_id}")
async def get_slot(slot_id: str):
    doc = await slots.find_one({"id": slot_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Slot not found")
    return doc


@router.get("/{slot_id}/transactions")
async def slot_transactions(slot_id: str):
    docs = await transactions.find({"slotId": slot_id}, {"_id": 0}).to_list(200)
    return docs


@router.get("/{slot_id}/messages")
async def slot_messages(slot_id: str):
    docs = await sent_messages.find({"slotId": slot_id}, {"_id": 0}).to_list(500)
    return docs
