"""MongoDB connection + collection accessors for avsar backend."""
from __future__ import annotations

import os
from pathlib import Path

import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

_mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
_db_name = os.environ.get("DB_NAME", "avsar")

# Pass CA certificates bundle for secure Atlas TLS connections
_client_kwargs = {}
if "mongodb+srv://" in _mongo_url or "tls=true" in _mongo_url.lower() or "ssl=true" in _mongo_url.lower():
    _client_kwargs["tlsCAFile"] = certifi.where()

client: AsyncIOMotorClient = AsyncIOMotorClient(_mongo_url, **_client_kwargs)
db: AsyncIOMotorDatabase = client[_db_name]


def col(name: str):
    return db[name]


# Convenience references
clinics = col("clinics")
patients = col("patients")
waitlist_entries = col("waitlist_entries")
slots = col("slots")
transactions = col("transactions")
priority_passes = col("priority_passes")
checkout_tokens = col("checkout_tokens")
sent_messages = col("sent_messages")
subscription_transactions = col("subscription_transactions")
enterprise_leads = col("enterprise_leads")


async def ensure_indexes() -> None:
    """Create indexes required for correctness (idempotency, lookups)."""
    # Idempotency: at most one transaction per razorpay event.
    # sparse=True lets us have transactions without eventId if needed.
    await transactions.create_index(
        "razorpayEventId", unique=True, sparse=True, name="uniq_razorpay_event"
    )
    await subscription_transactions.create_index(
        "razorpayEventId", unique=True, sparse=True, name="uniq_sub_razorpay_event"
    )
    await subscription_transactions.create_index(
        "razorpayPaymentId", unique=True, sparse=True, name="uniq_sub_razorpay_payment"
    )
    await checkout_tokens.create_index("token", unique=True, name="uniq_checkout_token")
    await slots.create_index([("clinicId", 1), ("startTime", 1)], name="clinic_start")
    await waitlist_entries.create_index(
        [("clinicId", 1), ("consentGivenAt", 1)], name="clinic_consent"
    )
    await priority_passes.create_index(
        [("patientId", 1), ("clinicId", 1), ("redeemed", 1)], name="pass_lookup"
    )
