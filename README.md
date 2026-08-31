# avsar

> Automated standby revenue & last-minute cancellation recovery for appointment-based businesses.

![version](https://img.shields.io/badge/version-0.1.0-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Motor-47A248?logo=mongodb&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-Gateway-0C2340?logo=razorpay&logoColor=white)
![tests](https://img.shields.io/badge/tests-37%20passed-brightgreen)

---

## What is avsar?

When an appointment gets cancelled last-minute, **avsar** automatically broadcasts the open slot to your opted-in WhatsApp waitlist. The first customer to confirm secures the slot instantly via atomic single-winner checkout, preventing double-bookings and recovering lost revenue with 0% platform commission.

Ideal for **clinics, salons, spas, wellness centers, consultancies, and high-demand service businesses**.

---

## How It Works

```
[Cancellation Occurs] 
       ↓
[Instant WhatsApp Broadcast to Waitlist]
       ↓
[First-to-Claim Atomic Checkout]
       ├── Winner  → Instant Confirmation
       └── Loser(s) → Automatic 1-Second Refund
```

1. **Instant Broadcast**: Trigger price-free WhatsApp alerts to waitlisted clients the moment a slot opens.
2. **Atomic Lock Engine**: MongoDB `findOneAndUpdate` ensures only one customer can claim a slot (race-condition proof).
3. **Instant Auto-Refunds**: Anyone completing checkout a fraction of a second later gets automatically refunded by the gateway.
4. **0% Commission**: Flat subscription model (₹1,999/mo) — you keep 100% of your service and consultation fees.
5. **Self-Serve Credits/Refunds**: Clients choose between instant bank refunds or 14-day priority pass credits if a slot is rescheduled.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI (Python 3.11+), Motor, Pydantic v2, Uvicorn |
| **Frontend** | React 18, Tailwind CSS, Framer Motion, Lucide Icons |
| **Database** | MongoDB |
| **Payments** | Razorpay Gateway (HMAC-SHA256 webhooks, idempotency) |
| **Testing** | Pytest, pytest-asyncio (37 tests) |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/theadarshcoder/Avsar.git
cd Avsar

# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

Create `backend/.env`:
```env
MONGO_URI="mongodb://127.0.0.1:27017"
DB_NAME="avsar_db"
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your_jwt_secret"
PAYMENT_MODE="razorpay" # or "mock"
RAZORPAY_KEY_ID="rzp_test_xxx"
RAZORPAY_KEY_SECRET="your_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
MOCK_OVERRIDE_TOKEN="avsar"
```

Create `frontend/.env`:
```env
REACT_APP_API_URL="http://localhost:8000/api"
```

### 3. Run

```bash
# Seed demo data
cd backend
python seed.py

# Start Backend (Port 8000)
python -m uvicorn server:app --reload

# Start Frontend (Port 3000)
cd ../frontend
npm start
```

---

## Test Suite

```bash
cd backend
python -m pytest tests/test_payment_gateway_local.py -v
```

---

## License

[MIT](LICENSE)
