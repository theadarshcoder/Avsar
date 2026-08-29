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
        .post(`/checkout/${token}/mock-pay`, {
            forceEventId,
            fireWebhook: true,
            simulateFailure,
        })
        .then((r) => r.data);

export default client;
