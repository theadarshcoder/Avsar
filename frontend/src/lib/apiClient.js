import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const client = axios.create({
    baseURL: API,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
});

// ── clinics / slots ─────────────────────────────────────────────────────
export const getClinic = (clinicId) =>
    client.get(`/clinics/${clinicId}`).then((r) => r.data);

export const listSlots = (clinicId) =>
    client.get(`/clinics/${clinicId}/slots`).then((r) => r.data);

export const openSlotAndBroadcast = (slotId) =>
    client.post(`/clinics/slots/${slotId}/open`).then((r) => r.data);

export const cancelBookedSlot = (slotId) =>
    client.post(`/clinics/slots/${slotId}/cancel-booked`).then((r) => r.data);

export const getSlotOutbox = (slotId) =>
    client.get(`/clinics/slots/${slotId}/outbox`).then((r) => r.data);

export const getClinicStatsToday = (clinicId) =>
    client.get(`/clinics/${clinicId}/stats/today`).then((r) => r.data);

export const getSlot = (slotId) =>
    client.get(`/slots/${slotId}`).then((r) => r.data);

// ── waitlist ────────────────────────────────────────────────────────────
export const listWaitlist = (clinicId) =>
    client.get(`/clinics/${clinicId}/waitlist`).then((r) => r.data);

export const addToWaitlist = (clinicId, body) =>
    client.post(`/clinics/${clinicId}/waitlist`, body).then((r) => r.data);

export const recordConsent = (entryId) =>
    client
        .post(`/clinics/waitlist/${entryId}/consent`)
        .then((r) => r.data);

export const removeWaitlistEntry = (entryId) =>
    client.delete(`/clinics/waitlist/${entryId}`).then((r) => r.data);

// ── transactions / choice ───────────────────────────────────────────────
export const getTransaction = (txId) =>
    client.get(`/clinics/transactions/${txId}`).then((r) => r.data);

export const submitChoice = (txId, choice) =>
    client
        .post(`/clinics/transactions/${txId}/choice`, { choice })
        .then((r) => r.data);

// ── checkout ────────────────────────────────────────────────────────────
export const getCheckout = (token) =>
    client.get(`/checkout/${token}`).then((r) => r.data);

export const mockPay = (token, { forceEventId, simulateFailure = false } = {}) =>
    client
        .post(
            `/checkout/${token}/mock-pay`,
            {
                forceEventId,
                fireWebhook: true,
                simulateFailure,
            },
            {
                // Live server may be in razorpay mode — this header keeps mock-pay usable
                // from Playwright / manual dev flows. Never used from the real Pay button.
                headers: { "X-Doctro-Test-Override": "doctro-testing-override" },
            },
        )
        .then((r) => r.data);

export const createOrder = (token) =>
    client.post(`/checkout/${token}/order`).then((r) => r.data);

export const pollCheckoutOutcome = (token) =>
    client.get(`/checkout/${token}/outcome`).then((r) => r.data);

export default client;
