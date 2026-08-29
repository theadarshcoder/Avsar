import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import UrgencyBanner from "../components/checkout/UrgencyBanner";
import PriceBreakdown from "../components/checkout/PriceBreakdown";
import { getCheckout, mockPay } from "../lib/apiClient";

const OUTCOME = {
    IDLE: "idle",
    PAYING: "paying",
    TAKEN: "taken",
    EXPIRED: "expired",
    FAILED: "failed",
};

export default function Checkout() {
    const { slotToken } = useParams();
    const nav = useNavigate();
    const [data, setData] = useState(null);
    const [outcome, setOutcome] = useState(OUTCOME.IDLE);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;
        getCheckout(slotToken)
            .then((d) => alive && setData(d))
            .catch((e) => alive && setError(e?.response?.data?.detail || String(e)));
        return () => {
            alive = false;
        };
    }, [slotToken]);

    if (error) {
        return (
            <Frame>
                <div className="doctro-card max-w-xl" data-testid="checkout-error">
                    <div className="font-serif text-2xl mb-2">This checkout link isn't valid.</div>
                    <p className="opacity-80 text-sm">{String(error)}</p>
                </div>
            </Frame>
        );
    }

    if (!data) return <Frame>Loading…</Frame>;

    if (data.state === "expired" || outcome === OUTCOME.EXPIRED) {
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

    if (data.state === "taken" || outcome === OUTCOME.TAKEN) {
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

    const doPay = async ({ simulateFailure = false } = {}) => {
        setOutcome(OUTCOME.PAYING);
        setError(null);
        try {
            const r = await mockPay(slotToken, { simulateFailure });
            const wh = r?.webhookResponse;
            const code = wh?.code;
            if (code === "BOOKED") {
                nav(`/confirmation/${wh.transactionId}`);
                return;
            }
            if (code === "SLOT_JUST_TAKEN") {
                setOutcome(OUTCOME.TAKEN);
                return;
            }
            if (code === "SLOT_EXPIRED") {
                setOutcome(OUTCOME.EXPIRED);
                return;
            }
            if (code === "PAYMENT_FAILED" || code === "DUPLICATE_EVENT") {
                setOutcome(OUTCOME.FAILED);
                setError(wh.message || "Payment did not complete.");
                return;
            }
            setOutcome(OUTCOME.FAILED);
            setError(`Unexpected response: ${JSON.stringify(wh)}`);
        } catch (e) {
            setOutcome(OUTCOME.FAILED);
            setError(e?.response?.data?.detail || String(e));
        }
    };

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
                            onClick={() => doPay()}
                            disabled={outcome === OUTCOME.PAYING}
                        >
                            {outcome === OUTCOME.PAYING
                                ? "Confirming payment…"
                                : `Pay ₹${Number(
                                      data.priceBreakdown.total
                                  ).toLocaleString("en-IN")}`}
                        </button>
                        <button
                            data-testid="btn-simulate-fail"
                            className="doctro-pill doctro-pill-secondary w-full"
                            onClick={() => doPay({ simulateFailure: true })}
                            disabled={outcome === OUTCOME.PAYING}
                            title="Demo control — simulate a failed payment webhook."
                        >
                            Simulate payment failure
                        </button>
                        {outcome === OUTCOME.FAILED && (
                            <div
                                className="text-sm rounded-xl p-3"
                                data-testid="checkout-failed-msg"
                                style={{ background: "#FFE4E4", color: "#5A0E0E" }}
                            >
                                <b>Payment did not complete.</b>
                                <div className="opacity-80 mt-1">{error}</div>
                                <div className="opacity-80 mt-1">
                                    You can try again — this slot is still open.
                                </div>
                            </div>
                        )}
                        <div className="text-[11px] opacity-60 text-center">
                            Razorpay is MOCKED in Phase 1 — no money moves.
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
            <Nav />
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
