# doctro — PRD (living document)

## Original problem statement (verbatim summary)
Web app for dental clinics in India that fills last-minute cancellations by
notifying a consented waitlist over WhatsApp and running a locked,
single-winner checkout. Phase 1 = backend only. Stack: React (Phase 2) +
FastAPI + MongoDB.

## Non-negotiable business rules (must never break)
1. **No price in WhatsApp templates** — ever.
2. **No percentage fees** — clinic pays flat subscription, patient pays a flat ₹50 handling fee (constant rupees).
3. **Consent gate** — a `WaitlistEntry` must have a non-null `consentGivenAt` to receive any standby notification. Enforced at the query level.
4. **Cancel-after-book** — patient must be offered BOTH refund AND credit. Never auto-convert.

## User personas
- **Clinic operator**: opens cancelled slots, cancels booked slots, watches broadcasts fan out.
- **Consented patient**: receives standby WhatsApp, opens link, sees price, pays; either wins or gets refund.
- **Non-consented patient**: never notified. Silent.

## Architecture (Phase 1)
```
/app/backend/
├── server.py               FastAPI entry, mounts /api router, ensures indexes
├── config.py               FRONTEND_URL, HANDLING_FEE (50), TTL, webhook secret
├── database.py             Motor client + collection refs + index setup
├── seed.py                 Idempotent seed (--reset for wipe)
├── acceptance_test.py      Runs all 4 mandated acceptance checks
├── models/                 Clinic, Patient, WaitlistEntry, Slot, Transaction,
│                           PriorityPass, CheckoutToken
├── services/               pricing, notification (WhatsApp MOCK),
│                           slot_lock (atomic find_one_and_update), ledger
└── routes/
    ├── clinics.py          create/list/open-slot (broadcast), cancel-booked, choice
    ├── slots.py            read-only slot inspection
    ├── checkout.py         GET checkout by token, POST /mock-pay
    └── webhooks/
        ├── razorpay.py     HMAC-verified webhook; shared process_webhook_event
        └── whatsapp.py     Inbound mock stub
```

## What's implemented (2026-02-01)
- All 7 Mongo models with sensible defaults, no ObjectId leakage.
- **Unique index** on `transactions.razorpayEventId` → race-safe idempotency.
- **Atomic slot lock** via single `find_one_and_update({id, status:"open", startTime:>now}, {$set:...})` — no read-then-write.
- **Broadcast** filters consent at the query level; failure isolation records `lastNotificationError` and continues.
- **WhatsApp MOCK** logs every attempt to `sent_messages`. Phones ending in `0000` deterministically fail (test hook).
- **Pricing**: `standby = standard - standbyAdjustment + 50`, PriorityPass amount deducted, floored at 0.
- **Razorpay MOCK** with real HMAC-SHA256 signature verification structure.
- **Webhook flow**: idempotency → atomic lock → transaction+redeem-pass+booked+confirmation OR refund with distinct code (`SLOT_JUST_TAKEN` vs `SLOT_EXPIRED`).
- **Cancel-booked**: exposes the transaction; explicit refund/credit choice required.
- **PriorityPass**: issued from credit choice (`amount = totalPaid`, TTL 14 days), auto-applied at next checkout at same clinic, redeemed inside the winning lock flow.
- **Acceptance test** run in-process (`python acceptance_test.py`): all 4 checks green (broadcast/consent/failure-isolation, duplicate-eventId, concurrency race with asyncio.gather, expired slot).
- **OpenAPI** exposed at `/api/openapi.json` (17 paths).

## Prioritized backlog

### P0 (Phase 2 — Frontend)
- Clinic dashboard: today's slots, "cancel/open" per slot, live broadcast result panel.
- Waitlist management: add/remove patient, capture consent (consentText + timestamp).
- Checkout page at `/checkout/{token}`: shows only price on this page; refund/credit selector on cancelled bookings.
- Owner login (see P1 auth) once we move off "no-auth by clinicId".

### P1 (still backend)
- Auth: pick between JWT custom auth and Emergent Google Auth (currently open by `clinicId`).
- Rate-limit `/mock-pay` per token; enforce single active checkout token per (slot, patient).
- Retry queue for failed WhatsApp confirmations (currently logged, slot stays `locked`).
- Real Razorpay + WABA credentials & production signature verification (`# MOCK` sites already flagged).
- Analytics: slots filled vs offered, average time-to-fill, per-clinic revenue.

### P2
- Multi-clinic operator accounts.
- SMS fallback provider when WhatsApp delivery fails.
- Localised template variants (Hindi, Kannada).

## Next tasks
1. Build Phase 2 React frontend.
2. Swap MOCK markers for real integrations once WABA + Razorpay keys are provided.
3. Add auth per user's choice.
