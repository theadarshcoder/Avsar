# avsar — PRD (living document)

## Original problem statement (verbatim summary)
Web app for dental clinics in India that fills last-minute cancellations by
notifying a consented waitlist over WhatsApp and running a locked,
single-winner checkout. Phase-1 = backend only. Phase-2 = React frontend.
Stack: React + FastAPI + MongoDB.

## Non-negotiable business rules
1. **No price in WhatsApp templates** — ever.
2. **No percentage fees** — flat monthly subscription, flat ₹50 handling fee.
3. **Consent gate** — `consentGivenAt` non-null required for any notification (enforced in the query).
4. **Cancel-after-book** — patient must be offered BOTH refund AND credit. Never auto-convert.

## Personas
- Clinic operator: opens cancelled slots, cancels booked slots, watches broadcasts.
- Consented patient: gets WhatsApp, opens link, pays; wins or auto-refunded.
- Non-consented patient: never notified.

## Architecture

### Backend (Phase 1 — done)
`server.py`, `config.py`, `database.py`, `seed.py`, `acceptance_test.py`.
Models: Clinic, Patient, WaitlistEntry, Slot, Transaction, PriorityPass, CheckoutToken.
Services: pricing, notification (WhatsApp MOCK, phone-0000 fail hook), slot_lock
(single atomic find_one_and_update), ledger (refund + priority pass).
Routes under `/api`: clinics (create/list/open-slot/broadcast/cancel-booked/choice/stats/outbox/transaction),
slots (inspection), checkout (GET + `/mock-pay`), webhooks/razorpay (HMAC), webhooks/whatsapp (stub).

### Frontend (Phase 2 — done)
`src/App.js` routes: `/`, `/dashboard/:clinicId`, `/checkout/:slotToken`,
`/confirmation/:bookingId`, `/choice/:transactionId`.
Components: `Nav`, `Footer`, `roi/{SliderGroup, BleedOutputBox}`,
`dashboard/{CalendarGrid, RevenueTicker, SlotStatusBadge}`,
`checkout/{UrgencyBanner, PriceBreakdown, RefundOrCreditChoice}`,
`mockups/{VacancyMockup, WhatsAppMockup, CheckoutMockup}`,
`hooks/useSlotStatus`, `lib/apiClient` (all API calls through this — zero business logic outside it).

Design system: serif = Lora (headlines) + italic Lora (footnotes); body = Inter.
Flat section colors (lavender, teal, peach, pale yellow, cream, near-black), no gradients.
Rounded pill nav with visible margin. Two-tone pill buttons (black primary / cream secondary, identical size).

## What's implemented (2026-02-01)

Backend
- All 7 Mongo models. Unique index on `transactions.razorpayEventId`.
- Atomic slot lock (`find_one_and_update` with `status:"open" AND startTime:>now`).
- Broadcast filters consent at the query level; failure isolation via `lastNotificationError`.
- WhatsApp MOCK logs every attempt; phones ending `0000` deterministically fail.
- Pricing: `subtotal = standard - standbyAdjustment + ₹50`, PriorityPass floored at 0.
- Razorpay MOCK with real HMAC-SHA256 signature verification.
- Idempotency → atomic lock → txn+redeem-pass+booked+confirmation OR refund with distinct code.
- Cancel-booked returns transaction; explicit refund/credit choice required (409 on double-choice).
- PriorityPass 14-day TTL, auto-applied at next checkout, redeemed inside winning lock.
- Acceptance script: broadcast/consent/failure-isolation, duplicate-eventId, concurrency race, expired slot — all green.

### Concurrency-test disclosure

The concurrency race test in `acceptance_test.py` consisted of **two synthetic
HMAC-signed webhook payloads POSTed directly to `/api/webhooks/razorpay` in
parallel via `asyncio.gather` (through the `/api/checkout/{token}/mock-pay`
internal path that fires the same handler)** — NOT two real Razorpay
test-mode checkouts racing. The simulated payloads exercise the atomic
`find_one_and_update` lock and the idempotency index on `razorpayEventId`,
which is what the test is designed to prove. **Live Razorpay concurrency has
not been tested because the gateway is mocked** (both order creation and
refunds go through functions marked `# MOCK:` — replace when real
Razorpay Key Secret + Webhook Secret are provided).

Frontend
- Homepage: hero, ROI calculator (three sliders + live math + verbatim footnote), three explainer sections with product-UI mockups (built as CSS/SVG — guarantees zero price leak in the WhatsApp mockup), pricing section (₹1,999/mo AND ₹50 handling as two separate line items), compliance section, near-black footer.
- Dashboard: today's slots, cancel-scheduled fires broadcast, teal Mock WhatsApp outbox with per-patient status + per-patient checkout link, cancel-booked opens the choice page link, `RevenueTicker` polls stats every 5s.
- Checkout: `UrgencyBanner` (truthful countdown from real `startTime`), `PriceBreakdown` (renders exactly what backend returns), pay + simulate-failure buttons, distinct screens for BOOKED / SLOT_JUST_TAKEN / SLOT_EXPIRED / PAYMENT_FAILED.
- Confirmation: appointment + amount + transaction id + WhatsApp note (labeled mock).
- Choice: identical-size pill buttons (measured 220×52), no default, `Confirm your choice` gated on a selection, credit → shows pass id + expiry, refund → shows refund id, 409 → "already made" state.

## Backlog

### P0 (still open)
- Auth: pick JWT custom vs Emergent Google Auth.
- Swap the four `# MOCK:` seams for real Razorpay + WABA once keys are provided.
- Retry queue for failed WhatsApp confirmations (currently logged, slot stays `locked`).

### P1
- Waitlist management UI: add/remove patient with consent capture (consentText + timestamp).
- Analytics: fill-rate per day/week, average time-to-fill, per-doctor breakdown.
- Rate-limit `/mock-pay` per token; enforce single active checkout token per (slot, patient).

### P2
- Multi-clinic operator accounts.
- SMS fallback provider.
- Localised template variants (Hindi, Kannada).

## Next tasks
1. Provide real Razorpay + WABA keys → swap MOCKS.
2. Decide auth model → implement.
3. Ship waitlist management UI (P1).
