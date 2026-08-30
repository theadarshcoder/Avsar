# doctro

> Turn last-minute dental clinic cancellations into recovered standby revenue with automated consent-first WhatsApp waitlists, atomic single-winner checkout, and zero doctor fee cuts.

---

## Why doctro

Dental clinics operate on tight schedules where an empty chair represents unrecoverable revenue loss. A typical 2-to-4 chair clinic bleeds **₹12,000 to ₹50,000+ every month** due to last-minute cancellations and no-shows occurring within 2 to 4 hours of appointment times.

Traditional solutions create operational bottlenecks:
- **Manual Staff Outreach**: Front-desk staff spend 20–30 minutes calling waitlisted patients one by one while the chair sits idle.
- **Awkward Double-Booking**: Broadcasts that lack concurrency controls lead to simultaneous arrivals and frustrated patients.
- **Aggregator Commission Traps**: Traditional healthcare booking aggregators take **15% to 30%** cuts on consultations, eating clinic margins.

**doctro fixes this with an automated, race-condition-proof standby engine:**
1. **Instant Broadcast**: When a cancellation occurs, an automated WhatsApp notification is dispatched simultaneously to opted-in waitlist patients.
2. **Atomic Single-Winner Checkout**: The first patient to confirm locks the slot instantly in an atomic database transaction.
3. **Automated Instant Refunds**: Any patient who attempts payment in the same second receives an immediate, automated refund with zero staff intervention.
4. **Self-Serve Priority Passes**: If a clinic cancels a confirmed standby patient, the patient can choose an instant bank refund or a 14-day automated priority pass credit.
5. **Zero Commission Economics**: Doctro operates on a flat monthly subscription (₹1,999/mo) and a ₹50 flat handling fee paid by the standby patient. **Doctro takes 0% cut of doctor consultation fees.**

---

## Tech Stack

- **Backend Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+ async API engine)
- **ASGI Web Server**: [Uvicorn](https://www.uvicorn.org/)
- **Database & Storage**: [MongoDB](https://www.mongodb.com/) via [Motor](https://motor.readthedocs.io/) async driver & [PyMongo](https://pymongo.readthedocs.io/)
- **Data Validation & Schemas**: [Pydantic v2](https://docs.pydantic.dev/)
- **Payment Gateway & Security**: [Razorpay Orders & Webhooks API](https://razorpay.com/docs/) with HMAC-SHA256 signature verification & idempotency handling
- **Frontend Framework**: [React 18](https://react.dev/) with [React Router v6](https://reactrouter.com/)
- **Styling & Design System**: [Tailwind CSS](https://tailwindcss.com/) with custom DOCTRO editorial token palette
- **Animations & Micro-interactions**: [Framer Motion](https://www.framer.com/motion/)
- **Icons & Visuals**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/) (frontend) & [HTTPX](https://www.python-httpx.org/) (backend)
- **Testing & Quality**: [Pytest](https://docs.pytest.org/), `pytest-asyncio`, and local automated payment mocking suites

---

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/theadarshcoder/DOCTRO.git
cd DOCTRO

# Install Backend Dependencies
cd backend
pip install -r requirements.txt

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create `.env` in `backend/`:
```env
# MongoDB Connection
MONGO_URI="mongodb://127.0.0.1:27017"
DB_NAME="doctro_db"

# Server & CORS Configuration
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your_secure_jwt_secret_here"

# Payment Gateway Configuration
# Mode: "mock" (offline demo) or "razorpay" (live/test gateway)
PAYMENT_MODE="razorpay"
RAZORPAY_KEY_ID="rzp_test_your_key_id_here"
RAZORPAY_KEY_SECRET="your_razorpay_secret_here"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret_here"

# Test / Mock Gating Token (Required for 1-click test checkout in razorpay mode)
MOCK_OVERRIDE_TOKEN="doctro"
```

Create `.env` in `frontend/`:
```env
REACT_APP_API_URL="http://localhost:8000/api"
```

### 3. Seed Demo Data

Populate demo dental clinics, doctors, standby slots, and consent-verified waitlist entries:
```bash
cd backend
python seed.py
```

### 4. Start Development Servers

Start Backend Server:
```bash
cd backend
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

Start Frontend Server:
```bash
cd frontend
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage Examples

### 1. Create a Standby Slot Broadcast & Booking Request

```bash
curl -X POST http://127.0.0.1:8000/api/clinics/clinic_smile_dental_indiranagar/slots \
  -H "Content-Type: application/json" \
  -d '{
    "doctorName": "Dr. Anjali Menon",
    "doctorSpecialty": "Orthodontics & General Dentistry",
    "chairNumber": 1,
    "startTime": "2026-08-30T15:30:00Z",
    "endTime": "2026-08-30T16:15:00Z",
    "originalFee": 1200,
    "standbyFee": 800
  }'
```

**Expected Response Structure:**
```json
{
  "slot": {
    "id": "slot_smile_indira_20260830_1530",
    "clinicId": "clinic_smile_dental_indiranagar",
    "doctorName": "Dr. Anjali Menon",
    "doctorSpecialty": "Orthodontics & General Dentistry",
    "startTime": "2026-08-30T15:30:00Z",
    "endTime": "2026-08-30T16:15:00Z",
    "standbyFee": 800,
    "handlingFee": 50,
    "status": "broadcasting",
    "slotToken": "stby_tok_9a8b7c6d5e4f",
    "broadcastCount": 6,
    "checkoutUrl": "http://localhost:3000/checkout/stby_tok_9a8b7c6d5e4f"
  }
}
```

### 2. Standby Priority Price Calculation with Credit Pass Auto-Floor

```bash
curl -X GET http://127.0.0.1:8000/api/checkout/stby_tok_9a8b7c6d5e4f/price?phone=%2B919900000001
```

**Expected Response Structure:**
```json
{
  "doctorFee": 800,
  "handlingFee": 50,
  "creditDiscount": 400,
  "totalPayable": 450,
  "creditApplied": {
    "passId": "pass_cr_883921",
    "initialAmount": 400,
    "usedAmount": 400,
    "remainingBalance": 0
  },
  "commissionNotice": "0% clinic commission deduction. Clinic receives 100% of doctor fee."
}
```

---

## Architecture & Engineering Highlights

```
                       ┌──────────────────────────────────────────────┐
                       │          Standby Cancellation Event          │
                       └──────────────────────┬───────────────────────┘
                                              │
                                   (Broadcast Webhook)
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │   Consent-First WhatsApp Notification Queue  │
                       │     (Strict Price-Free Compliance Copy)      │
                       └──────────────────────┬───────────────────────┘
                                              │
                              (Concurrent Patient Checkouts)
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │     Atomic Concurrency Slot Lock Engine      │
                       │ (MongoDB `findOneAndUpdate` $eq: "available")│
                       └──────────────┬───────────────┬───────────────┘
                                      │               │
                     [Winner Transaction]       [Tie-Break Loser]
                                      │               │
                                      ▼               ▼
                       ┌──────────────────────┐┌──────────────────────┐
                       │ Razorpay Capture &   ││ Automated Instant    │
                       │ Instant Confirmation ││ Gateway Full Refund  │
                       └──────────────────────┘└──────────────────────┘
```

### 1. Single-Winner Atomic Concurrency Lock
When multiple waitlisted patients open the checkout link simultaneously, DOCTRO executes an atomic state transition (`findOneAndUpdate` with pre-condition `status: "available"`). The winning transaction locks the slot instantly, and any concurrent payer is automatically refunded with zero staff intervention.

### 2. Production Mock Payment Gating
Mock checkout endpoints are protected in live environments (`PAYMENT_MODE=razorpay`). Requests return `403 MOCK_DISABLED` unless an explicit `X-Doctro-Test-Override` token header is provided, ensuring demo controls cannot cause unauthorized revenue leakages.

### 3. Compliance & Consent-First Architecture
In strict adherence to medical privacy and advertising guidelines:
- **Price-Free WhatsApp Templates**: Broadcasts include doctor name, specialty, slot time, and secure checkout URL — never marketing prices or discounts.
- **Server-Enforced Consent Logs**: Patient waitlist additions require explicit consent checkboxes; consent timestamps (`consentGivenAt`) are generated strictly on the server.

### 4. Idempotent Webhook & Payment Reconciliation
All payment and subscription confirmation endpoints verify unique cryptographic signatures (`razorpay_signature`) and enforce deduplication via unique sparse database indexes (`razorpayEventId` and `razorpayPaymentId`), returning `DUPLICATE_EVENT` to prevent duplicate charges or double activations.

---

## Key Features

- **Interactive Standby Revenue Calculator**: Dynamic visual simulation of monthly cancellation bleed and ROI recovery projections.
- **Full-Screen Desktop Subscription Gateway**: Executive 2-column web checkout for clinic monthly (₹1,999/mo) and annual (₹19,190/yr with 20% savings) plans.
- **14-Day Free Access Engine**: Instant trial onboarding with phone/email abuse deduplication (`409 TRIAL_ALREADY_USED`).
- **Patient Self-Serve Choice Portal**: Transparent interface allowing patients to pick between an immediate bank refund or a 14-day priority pass credit if a clinic cancels.
- **Real-Time Clinic Dashboard**: Live metrics tracking recovered standby revenue, chair vacancy logs, and WhatsApp outbox delivery states.
- **Pricing FAQ & Feature Comparison Matrix**: Expandable accordion detailing handling fee mechanics, atomic locking guarantees, and compliance rules.

---

## Automated Test Suite

Run the full local unit test suite covering payment gateways, signature verification, atomic locking, trial deduplication, and mock gating:

```bash
cd backend
python -m pytest tests/test_payment_gateway_local.py -v
```

**Results:**
```
============================= 37 passed in 0.56s =============================
```

---

## Contributing

Contributions, bug reports, and feature proposals are welcome. Please open an issue or submit a pull request with test coverage for any architectural modifications.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
