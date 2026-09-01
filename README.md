# Avsar

When a customer cancels an appointment at the last minute, **Avsar** automatically alerts waiting people on WhatsApp so the empty spot gets booked right away — saving businesses from lost revenue.

![version](https://img.shields.io/badge/version-0.1.0-blue)
![python](https://img.shields.io/badge/python-%3E%3D3.11-yellow?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Motor-47A248?logo=mongodb&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-Gateway-0C2340?logo=razorpay&logoColor=white)
![Tailwind](https://img.shields.io/badge/TailwindCSS-v3-38B2AC?logo=tailwindcss&logoColor=white)
![tests](https://img.shields.io/badge/tests-37%20passed-brightgreen)

---

## Why Avsar

Appointment-driven businesses (clinics, salons, spas, wellness centers, consultancies, and specialty practices) face severe structural revenue leakage from last-minute cancellations. A typical service business loses between **₹15,000 and ₹60,000+ each month** when clients cancel within 2 to 4 hours of their scheduled slot.

Manual front-desk operations cannot resolve this problem:
- **High-Friction Manual Outreach**: Staff spend 20–30 minutes calling waitlisted clients sequentially, during which the slot or service capacity remains idle and lost forever.
- **Double-Booking Risks**: Uncoordinated broadcast messages without atomic concurrency locks cause multiple clients to arrive at the same time.
- **Predatory Aggregator Commissions**: Third-party aggregators and booking marketplaces frequently extract **15% to 30%** cuts from your hard-earned service revenue.

**Avsar provides an automated, race-condition-proof solution:**
1. **Instant Broadcast**: When a cancellation is flagged, an automated WhatsApp alert is dispatched immediately to opted-in waitlist clients.
2. **Atomic Single-Winner Checkout**: The first client to confirm locks the slot instantly in an atomic database operation (`status: "available" → "booked"`).
3. **Automated Instant Refunds**: Any client who attempts checkout in the same split-second receives an immediate, automated gateway refund with zero manual staff reconciliation.
4. **Self-Serve Priority Passes**: If a business cancels a confirmed standby slot, the customer can choose between an instant bank refund or an automated 14-day priority pass credit.
5. **Zero Commission Economics**: Avsar operates on a flat monthly subscription (₹1,999/mo) and a ₹50 flat handling fee paid by the standby customer. **Avsar takes 0% commission on your service and consultation fees.**

---

## Tech Stack

- **Backend API**: [FastAPI 0.110.0](https://fastapi.tiangolo.com/) (Python 3.11+, Async ASGI Engine)
- **ASGI Web Server**: [Uvicorn 0.28.0](https://www.uvicorn.org/)
- **Database & ODM**: [MongoDB](https://www.mongodb.com/) via [Motor 3.3.2](https://motor.readthedocs.io/) & [PyMongo 4.6.2](https://pymongo.readthedocs.io/)
- **Data Validation & Serialization**: [Pydantic v2](https://docs.pydantic.dev/)
- **Payment Gateway & Security**: [Razorpay Orders & Webhooks API](https://razorpay.com/docs/) with HMAC-SHA256 signature verification & idempotency handling
- **Frontend UI & State**: [React 18.2.0](https://react.dev/), [React Router DOM 6.22.0](https://reactrouter.com/)
- **Styling & Design System**: [Tailwind CSS 3.4.1](https://tailwindcss.com/) with custom Avsar editorial token palette
- **Animation & Motion**: [Framer Motion 11.0.0](https://www.framer.com/motion/)
- **Icons**: [Lucide React 0.344.0](https://lucide.dev/)
- **HTTP Client**: [Axios 1.6.7](https://axios-http.com/) & [HTTPX 0.27.0](https://www.python-httpx.org/)
- **Testing**: [Pytest 9.0.2](https://docs.pytest.org/), `pytest-asyncio`, `pytest-cov`

---

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/theadarshcoder/Avsar.git
cd Avsar

# Install Backend Dependencies
cd backend
pip install -r requirements.txt

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in `backend/`:

```env
# MongoDB Connection
MONGO_URI="mongodb://127.0.0.1:27017"
DB_NAME="avsar_db"

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
MOCK_OVERRIDE_TOKEN="avsar"
```

Create a `.env` file in `frontend/`:

```env
REACT_APP_API_URL="http://localhost:8000/api"
```

### 3. Seed Demo Data

Populate demo businesses, service providers / specialists, standby slots, and consent-verified waitlist entries:

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

## Usage Example

### Create a Standby Slot Broadcast Programmatically via the API:

```javascript
const response = await fetch("http://127.0.0.1:8000/api/clinics/biz_prime_indiranagar/slots", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    doctorName: "Dr. Anjali Menon",
    doctorSpecialty: "Consultant Specialist",
    chairNumber: 1,
    startTime: "2026-08-30T15:30:00Z",
    endTime: "2026-08-30T16:15:00Z",
    originalFee: 1200,
    standbyFee: 800
  })
});

const slotData = await response.json();
console.log(slotData);
```

### Expected Output Structure:

```json
{
  "slot": {
    "id": "slot_prime_indira_20260830_1530",
    "clinicId": "biz_prime_indiranagar",
    "doctorName": "Dr. Anjali Menon",
    "doctorSpecialty": "Consultant Specialist",
    "chairNumber": 1,
    "startTime": "2026-08-30T15:30:00Z",
    "endTime": "2026-08-30T16:15:00Z",
    "originalFee": 1200,
    "standbyFee": 800,
    "handlingFee": 50,
    "status": "broadcasting",
    "slotToken": "stby_tok_9a8b7c6d5e4f",
    "broadcastCount": 6,
    "checkoutUrl": "http://localhost:3000/checkout/stby_tok_9a8b7c6d5e4f"
  }
}
```

---

## Architecture

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
                               (Concurrent Client Checkouts)
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

---

## Features

- **Automated Standby Broadcast Engine**: Instantly dispatches price-free WhatsApp alerts to opted-in waitlists when cancellations occur.
- **Single-Winner Atomic Concurrency Lock**: Eliminates double-booking via database-level race condition protection.
- **Zero Commission Guarantee**: Flat subscription model ensuring businesses keep 100% of their service and consultation fees.
- **Full-Screen Desktop Subscription Checkout**: Executive 2-column web checkout for Monthly (₹1,999/mo) and Annual (₹19,190/yr - Save 20%) plans.
- **14-Day Free Access System**: Instant trial onboarding with phone and email duplicate abuse prevention.
- **Customer Refund & Credit Choice Portal**: Self-serve portal allowing customers to choose between immediate refunds or 14-day priority pass credits.
- **Interactive Bleed ROI Calculator**: Real-time slider calculation illustrating monthly revenue bleed vs. recovery potential.
- **Live Operations Dashboard & Delivery Outbox**: Comprehensive tracking of recovered revenue, active slots/resources, and WhatsApp notification states.
- **Production Mock Payment Gating**: Strict token override protection preventing unauthorized mock activations in production.

---

## Automated Test Suite

Execute the local test suite covering payment gateways, signature verification, atomic locking, trial deduplication, and mock gating:

```bash
cd backend
python -m pytest tests/test_payment_gateway_local.py -v
```

```
============================= 37 passed in 0.56s =============================
```

---

## Contributing

Contributions are welcome. Please open an issue or submit a pull request with unit test coverage for any proposed modifications.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<!-- Avsar Core Platform Engine -->
