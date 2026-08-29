# Doctro — Local Setup

Follow these steps to run the project from a fresh clone.

## Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- **MongoDB** running locally, or a MongoDB Atlas connection string

## Steps

1. **Copy `backend/.env.example` to `backend/.env`** and fill in real values.

   ```bash
   cp backend/.env.example backend/.env
   ```

   - Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to your Razorpay
     **test-mode** credentials (from the Razorpay Dashboard → Settings → API Keys).
   - Set `RAZORPAY_WEBHOOK_SECRET` to the secret configured in your
     Razorpay Dashboard → Webhooks.
   - Set `MOCK_OVERRIDE_TOKEN` to any random string (used to gate the
     mock-pay endpoint in non-mock mode).
   - Leave `PAYMENT_MODE=mock` for local development without real
     Razorpay API calls.

2. **Copy `frontend/.env.example` to `frontend/.env`.**

   ```bash
   cp frontend/.env.example frontend/.env
   ```

   Adjust `REACT_APP_BACKEND_URL` if your backend runs on a port other
   than 8000.

3. **Start MongoDB** locally, or point `MONGO_URL` in `backend/.env` at
   a MongoDB Atlas connection string.

   ```bash
   # If using a local install:
   mongod
   ```

4. **Install backend dependencies and start the server.**

   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn server:app --reload --port 8000
   ```

5. **Seed the database** (separate terminal, from `backend/`).

   ```bash
   cd backend
   python seed.py --reset
   ```

6. **Install frontend dependencies and start the dev server.**

   ```bash
   cd frontend
   npm install
   npm start
   ```

   The React app will open at `http://localhost:3000`.

## Running Tests

```bash
cd backend
python -m pytest tests/test_payment_gateway_local.py -n 0 -v
```

These tests mock MongoDB and Razorpay — no running server or database
is needed.
