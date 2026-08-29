"""Global configuration constants for doctro Phase 1 backend."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# The base URL Phase 2 frontend will run on. Kept in one place so the
# checkout link builder can be swapped without hunting through code.
FRONTEND_URL: str = os.environ.get(
    "FRONTEND_URL", "https://doctro-backend.preview.emergentagent.com"
).rstrip("/")

# BUSINESS RULE: handling fee is a FLAT RUPEE AMOUNT. Never a percentage.
HANDLING_FEE: int = int(os.environ.get("HANDLING_FEE", "50"))

# Priority pass lifetime after issuance.
PRIORITY_PASS_TTL_DAYS: int = 14

# Mock webhook secret. In production, real Razorpay secret comes from dashboard.
RAZORPAY_WEBHOOK_SECRET: str = os.environ.get(
    "RAZORPAY_WEBHOOK_SECRET", "mock_webhook_secret_doctro_phase1"
)


def checkout_link(token: str) -> str:
    return f"{FRONTEND_URL}/checkout/{token}"
