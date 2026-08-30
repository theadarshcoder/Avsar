import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import UrgencyBanner from "../components/checkout/UrgencyBanner";
import PriceBreakdown from "../components/checkout/PriceBreakdown";
import {
    createOrder,
    getCheckout,
    mockPay,
    pollCheckoutOutcome,
} from "../lib/apiClient";

const STAGE = {
    IDLE: "idle",
    OPENING_GATEWAY: "opening_gateway",
    CONFIRMING: "confirming",  // Razorpay handler fired; polling backend
    TAKEN: "taken",
    EXPIRED: "expired",
    FAILED: "failed",
};

// FastAPI raises HTTPException(status, {code, message}) which arrives as
// {detail: {code, message}}. Rendering that dict directly crashes React.
// Always use this normaliser before setState.
function humanError(e) {
    const d = e?.response?.data?.detail;
    if (typeof d === "string") return d;
    if (d && typeof d === "object") return d.message || JSON.stringify(d);
    if (typeof e === "string") return e;
    return e?.message || String(e);
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 45000;

export default function Checkout() {
    const { slotToken } = useParams();
    const nav = useNavigate();
    const [data, setData] = useState(null);
    const [stage, setStage] = useState(STAGE.IDLE);
    const [fatalError, setFatalError] = useState(null);
    const [retryError, setRetryError] = useState(null);
    const pollTimer = useRef(null);

    useEffect(() => {
        let alive = true;
        getCheckout(slotToken)
            .then((d) => alive && setData(d))
            .catch((e) => alive && setFatalError(humanError(e)));
        return () => {
            alive = false;
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
    }, [slotToken]);

    if (fatalError) {
        return (
            <Frame>
                <div className="doctro-card max-w-xl" data-testid="checkout-error">
                    <div className="font-serif text-2xl mb-2">This checkout link isn't valid.</div>
                    <p className="opacity-80 text-sm">{String(fatalError)}</p>
                </div>
            </Frame>
        );
    }
    if (!data) return <Frame>Loading…</Frame>;
    if (data.state === "expired" || stage === STAGE.EXPIRED) {
        return (
            <Frame>
                <StatusCard
                    testid="checkout-expired"
                    title="This offer has expired."
                    body="This standby slot has already started or passed. If your payment went through, we've initiated a refund automatically."
                />
            </Frame>
        );
    }
    if (data.state === "taken" || stage === STAGE.TAKEN) {
        return (
            <Frame>
                <StatusCard
                    testid="checkout-taken"
                    title="This slot was just taken."
                    body="Another standby patient paid a moment before you. Your payment attempt is being refunded automatically — no action needed."
                />
            </Frame>
        );
    }

    // ── The atomic lock still lives in the WEBHOOK. This client only asks
    // ── "is the webhook done yet?" and routes on the resolved outcome.
    const startPolling = () => {
        setStage(STAGE.CONFIRMING);
        setRetryError(null);
        const start = Date.now();
        pollTimer.current = setInterval(async () => {
            try {
                const out = await pollCheckoutOutcome(slotToken);
                if (out.state === "booked") {
                    clearInterval(pollTimer.current);
                    nav(`/confirmation/${out.transactionId}`);
                    return;
                }
                if (out.state === "lost_race") {
                    clearInterval(pollTimer.current);
                    setStage(STAGE.TAKEN);
                    return;
                }
                if (out.state === "expired") {
                    clearInterval(pollTimer.current);
                    setStage(STAGE.EXPIRED);
                    return;
                }
                if (Date.now() - start > POLL_TIMEOUT_MS) {
                    clearInterval(pollTimer.current);
                    setStage(STAGE.FAILED);
                    setRetryError(
                        "We didn't hear back from the payment gateway. Please try again — the slot is still open."
                    );
                }
            } catch (e) {
                // keep polling; a transient error shouldn't abort
            }
        }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
        if (pollTimer.current) clearInterval(pollTimer.current);
    };

    const openRazorpay = async () => {
        setStage(STAGE.OPENING_GATEWAY);
        setRetryError(null);
        try {
            const order = await createOrder(slotToken);
            if (!window.Razorpay) {
                setStage(STAGE.FAILED);
                setRetryError(
                    "Razorpay checkout could not be loaded. Check your network and try again."
                );
                return;
            }
            const rzp = new window.Razorpay({
                key: order.keyId,
                order_id: order.orderId,
                amount: order.amount,
                currency: order.currency || "INR",
                name: "doctro",
                description: `${order.notes?.doctorName || "Standby appointment"}`,
                prefill: order.prefill || {},
                notes: order.notes || {},
                theme: { color: "#101014" },
                handler: () => {
                    // Do NOT lock from here. The webhook is authoritative.
                    startPolling();
                },
                modal: {
                    ondismiss: () => {
                        // User closed the modal without completing. Slot stays open.
                        setStage(STAGE.FAILED);
                        setRetryError(
                            "You closed the payment window before completing. The slot is still open — try again when you're ready."
                        );
                    },
                },
            });
            rzp.on("payment.failed", (resp) => {
                setStage(STAGE.FAILED);
                setRetryError(
                    resp?.error?.description || "Your payment did not complete."
                );
            });
            rzp.open();
        } catch (e) {
            setStage(STAGE.FAILED);
            setRetryError(humanError(e));
        }
    };

    // Dev-only helper: simulate a payment webhook (mock endpoint)
    const runMock = async ({ simulateFailure = false } = {}) => {
        setStage(STAGE.CONFIRMING);
        setRetryError(null);
        try {
            const r = await mockPay(slotToken, { simulateFailure });
            const wh = r?.webhookResponse || {};
            const code = wh.code;
            if (code === "BOOKED") {
                stopPolling();
                nav(`/confirmation/${wh.transactionId}`);
                return;
            }
            if (code === "SLOT_JUST_TAKEN") { stopPolling(); setStage(STAGE.TAKEN); return; }
            if (code === "SLOT_EXPIRED") { stopPolling(); setStage(STAGE.EXPIRED); return; }
            if (code === "PAYMENT_FAILED" || code === "DUPLICATE_EVENT") {
                stopPolling(); setStage(STAGE.FAILED);
                setRetryError(wh.message || "Payment did not complete.");
                return;
            }
            setStage(STAGE.FAILED);
            setRetryError(`Unexpected response: ${JSON.stringify(wh)}`);
        } catch (e) {
            setStage(STAGE.FAILED);
            setRetryError(humanError(e));
        }
    };

    const mode = data.paymentMode || "razorpay";
    const payDisabled = stage === STAGE.OPENING_GATEWAY || stage === STAGE.CONFIRMING;

    return (
        <Frame>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-3 space-y-6">
                    <UrgencyBanner
                        startTime={data.slot.startTime}
                        doctorName={data.slot.doctorName}
                    />
                    <div className="doctro-card">
                        <div className="text-xs uppercase tracking-widest opacity-60">
                            Patient
                        </div>
                        <div className="font-serif text-2xl mt-1" data-testid="checkout-patient-name">
                            {data.patient.name}
                        </div>
                        <div className="text-sm opacity-70 mono">{data.patient.phone}</div>
                        <div className="text-xs opacity-60 mt-3">
                            Clinic: {data.clinic.name}
                        </div>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-6">
                    <PriceBreakdown breakdown={data.priceBreakdown} />
                    <div className="flex flex-col gap-3">
                        <button
                            data-testid="btn-pay-now"
                            className="doctro-pill doctro-pill-primary w-full"
                            onClick={openRazorpay}
                            disabled={payDisabled}
                        >
                            {stage === STAGE.OPENING_GATEWAY
                                ? "Opening secure checkout…"
                                : stage === STAGE.CONFIRMING
                                ? "Confirming your booking…"
                                : `Pay ₹${Number(data.priceBreakdown.total).toLocaleString("en-IN")}`}
                        </button>
                        {stage === STAGE.CONFIRMING && (
                            <div
                                className="text-sm rounded-xl p-3"
                                style={{ background: "var(--doctro-cream)" }}
                                data-testid="checkout-confirming-msg"
                            >
                                <b>Payment received.</b>
                                <div className="opacity-80 mt-1">
                                    Locking your slot with the clinic. This usually takes a couple of
                                    seconds — please don't close this tab.
                                </div>
                            </div>
                        )}
                        {stage === STAGE.FAILED && (
                            <div
                                className="text-sm rounded-xl p-3"
                                data-testid="checkout-failed-msg"
                                style={{ background: "#FFE4E4", color: "#5A0E0E" }}
                            >
                                <b>Payment did not complete.</b>
                                <div className="opacity-80 mt-1">{retryError}</div>
                                <div className="opacity-80 mt-1">
                                    You can try again — this slot is still open.
                                </div>
                            </div>
                        )}
                        {mode === "mock" && (
                            <button
                                data-testid="btn-simulate-fail"
                                className="doctro-pill doctro-pill-secondary w-full"
                                onClick={() => runMock({ simulateFailure: true })}
                                disabled={payDisabled}
                                title="Demo control — simulate a failed payment webhook."
                            >
                                Simulate payment failure
                            </button>
                        )}
                        <div className="text-[11px] opacity-60 text-center">
                            {mode === "razorpay"
                                ? "Payments powered by Razorpay (test mode)."
                                : "Razorpay is MOCKED in this environment — no money moves."}
                        </div>
                    </div>
                </div>
            </div>
        </Frame>
    );
}

function Frame({ children }) {
    return (
        <div>
            <section
                className="doctro-section section-bg-peach"
                style={{ marginTop: 12 }}
                data-testid="checkout-frame"
            >
                <div className="max-w-6xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                        Standby checkout
                    </div>
                    <h1 className="font-serif text-4xl sm:text-5xl mt-2 mb-6">
                        Confirm your standby slot.
                    </h1>
                    {children}
                </div>
            </section>
            <Footer />
        </div>
    );
}

function StatusCard({ title, body, testid }) {
    return (
        <div className="doctro-card max-w-xl" data-testid={testid}>
            <div className="font-serif text-3xl mb-2">{title}</div>
            <p className="opacity-80 text-sm">{body}</p>
            <a
                href="/"
                className="doctro-pill doctro-pill-secondary mt-6"
                style={{ height: 44, minWidth: 0, padding: "0 20px", fontSize: 14 }}
                data-testid="back-home"
            >
                Back to home
            </a>
        </div>
    );
}
