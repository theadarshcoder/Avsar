import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, RefreshCw, Lock, Zap, CheckCircle2, ArrowLeft } from "lucide-react";
import { createSubscriptionOrder, confirmSubscription, mockSubscriptionPay } from "../../lib/apiClient";

export default function SubscriptionModal({ isOpen, onClose, initialInterval = "monthly" }) {
    const [interval, setInterval] = useState(initialInterval);
    const [clinicName, setClinicName] = useState("Acme Center, Downtown");
    const [providerName, setProviderName] = useState("Alex Carter");
    const [email, setEmail] = useState("demo@acmecenter.in");
    const [phone, setPhone] = useState("+919900000001");
    const [stage, setStage] = useState("idle"); // idle | gateway | confirming | success | failed
    const [errorMsg, setErrorMsg] = useState(null);
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        setInterval(initialInterval);
    }, [initialInterval]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isAnnual = interval === "annual";
    const amountRupees = isAnnual ? 19190 : 1999;

    const handleRazorpay = async () => {
        setStage("gateway");
        setErrorMsg(null);

        try {
            const order = await createSubscriptionOrder({
                clinicName,
                email,
                phone,
                plan: "standard",
                billingInterval: interval,
            });

            if (!window.Razorpay) {
                setStage("failed");
                setErrorMsg("Razorpay checkout could not be loaded. Check your connection.");
                return;
            }

            const rzp = new window.Razorpay({
                key: order.keyId,
                order_id: order.orderId,
                amount: order.amount,
                currency: order.currency || "INR",
                name: "avsar",
                description: `Standard Subscription (${isAnnual ? "Annual" : "Monthly"})`,
                prefill: {
                    name: clinicName,
                    email,
                    contact: phone,
                },
                theme: { color: "#101014" },
                handler: async (response) => {
                    setStage("confirming");
                    try {
                        const conf = await confirmSubscription({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            clinicName,
                            email,
                            phone,
                            plan: "standard",
                            billingInterval: interval,
                        });
                        setSuccessData(conf);
                        setStage("success");
                    } catch (err) {
                        setStage("failed");
                        setErrorMsg(err?.response?.data?.detail?.message || err?.message || "Confirmation failed");
                    }
                },
                modal: {
                    ondismiss: () => {
                        setStage("failed");
                        setErrorMsg("Payment was dismissed before completing.");
                    },
                },
            });

            rzp.on("payment.failed", (resp) => {
                setStage("failed");
                setErrorMsg(resp?.error?.description || "Your payment did not complete.");
            });

            rzp.open();
        } catch (err) {
            setStage("failed");
            const d = err?.response?.data?.detail;
            setErrorMsg(typeof d === "string" ? d : d?.message || err?.message || "Failed to initiate subscription order.");
        }
    };

    const handleMockPay = async (simulateFailure = false) => {
        setStage("confirming");
        setErrorMsg(null);

        try {
            const res = await mockSubscriptionPay({
                clinicName,
                email,
                phone,
                plan: "standard",
                billingInterval: interval,
                simulateFailure,
            });

            if (res.status === "failed") {
                setStage("failed");
                setErrorMsg(res.message || "Simulated payment failure.");
                return;
            }

            setSuccessData(res);
            setStage("success");
        } catch (err) {
            setStage("failed");
            const d = err?.response?.data?.detail;
            setErrorMsg(typeof d === "string" ? d : d?.message || err?.message || "Mock payment failed.");
        }
    };

    const resetFlow = () => {
        setStage("idle");
        setErrorMsg(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#FFFFFF] flex flex-col overflow-y-auto"
            data-testid="subscription-fullscreen-checkout"
        >
            {/* Top Navigation Bar */}
            <div className="border-b border-[var(--avsar-line)] px-6 sm:px-12 py-4 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold opacity-70 hover:opacity-100 transition-opacity"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to pricing
                    </button>
                    <span className="text-[var(--avsar-line)]">|</span>
                    <span className="font-serif font-bold text-lg text-[#101014] tracking-tight">
                        avsar<span className="font-sans font-normal text-xs opacity-60 ml-2">checkout</span>
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-xs opacity-60">
                        <Lock className="w-3.5 h-3.5" /> 256-bit Encrypted Checkout
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-[var(--avsar-cream)] hover:bg-[#EDE6D5] text-[#101014] flex items-center justify-center transition-colors shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-6xl">
                    {stage === "success" ? (
                        <SuccessView data={successData} onClose={onClose} interval={interval} />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                            {/* Left Side: Plan Selection & Clinic Form (7 Cols) */}
                            <div className="lg:col-span-7 space-y-6">
                                <div>
                                    <div className="text-xs uppercase tracking-[0.25em] opacity-60 font-semibold">
                                        Business Subscription
                                    </div>
                                    <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#101014] mt-2 mb-2 leading-tight">
                                        Subscribe to Standard
                                    </h1>
                                    <p className="opacity-75 text-sm sm:text-base leading-relaxed max-w-xl">
                                        Turn customer cancellations into recovered standby revenue with automatic WhatsApp broadcasts and single-winner atomic locking.
                                    </p>
                                </div>

                                {/* Step 1: Cadence Selector */}
                                <div className="space-y-2">
                                    <label className="block text-xs uppercase tracking-wider opacity-60 font-semibold">
                                        1. Select Billing Interval
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setInterval("monthly")}
                                            className={`p-4 rounded-2xl border text-left transition-all ${
                                                interval === "monthly"
                                                    ? "border-[var(--avsar-ink)] bg-[var(--avsar-cream)] text-[#101014] shadow-sm ring-1 ring-[var(--avsar-ink)]"
                                                    : "border-[var(--avsar-line)] bg-white text-[#101014]/70 hover:border-black/30"
                                            }`}
                                        >
                                            <div className="text-xs uppercase tracking-wider opacity-60 font-bold">Monthly Plan</div>
                                            <div className="font-serif text-2xl mono mt-1 font-semibold">
                                                ₹1,999<span className="text-sm font-normal opacity-70">/month</span>
                                            </div>
                                            <div className="text-xs opacity-60 mt-1">Billed monthly · Cancel anytime</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInterval("annual")}
                                            className={`p-4 rounded-2xl border text-left transition-all relative ${
                                                interval === "annual"
                                                    ? "border-[var(--avsar-ink)] bg-[var(--avsar-cream)] text-[#101014] shadow-sm ring-1 ring-[var(--avsar-ink)]"
                                                    : "border-[var(--avsar-line)] bg-white text-[#101014]/70 hover:border-black/30"
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs uppercase tracking-wider opacity-60 font-bold">Annual Plan</span>
                                                <span className="text-[10px] font-bold uppercase bg-[var(--avsar-ink)] text-white px-2 py-0.5 rounded-full">
                                                    Save 20%
                                                </span>
                                            </div>
                                            <div className="font-serif text-2xl mono mt-1 font-semibold">
                                                ₹1,599<span className="text-sm font-normal opacity-70">/month</span>
                                            </div>
                                            <div className="text-xs text-emerald-800 font-semibold mt-1">
                                                ₹19,190/yr · 2 Months Free
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Step 2: Clinic Form */}
                                <div className="space-y-2">
                                    <label className="block text-xs uppercase tracking-wider opacity-60 font-semibold">
                                        2. Clinic Details
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider opacity-60 mb-1 font-medium">
                                                Business Name
                                            </label>
                                            <input
                                                type="text"
                                                value={clinicName}
                                                onChange={(e) => setClinicName(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--avsar-line)] focus:outline-none focus:border-[var(--avsar-ink)] text-sm font-body"
                                                placeholder="Acme Center Downtown"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider opacity-60 mb-1 font-medium">
                                                Professional / Contact
                                            </label>
                                            <input
                                                type="text"
                                                value={providerName}
                                                onChange={(e) => setProviderName(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--avsar-line)] focus:outline-none focus:border-[var(--avsar-ink)] text-sm font-body"
                                                placeholder="Alex Carter"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider opacity-60 mb-1 font-medium">
                                                Billing Email (for invoices)
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--avsar-line)] focus:outline-none focus:border-[var(--avsar-ink)] text-sm font-body"
                                                placeholder="demo@acmecenter.in"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider opacity-60 mb-1 font-medium">
                                                WhatsApp Phone
                                            </label>
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--avsar-line)] focus:outline-none focus:border-[var(--avsar-ink)] text-sm font-body mono"
                                                placeholder="+919900000001"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Trust & Compliance */}
                                <div className="pt-3 flex flex-wrap items-center gap-6 text-xs opacity-70 border-t border-[var(--avsar-line)]">
                                    <span className="flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5" /> PCI-DSS Level 1 Secure
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5 text-amber-600" /> Instant Activation
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 0% Commission Guarantee
                                    </span>
                                </div>
                            </div>

                            {/* Right Side: Order Summary & Checkout Card (5 Cols) */}
                            <div className="lg:col-span-5">
                                <div className="avsar-card bg-[var(--avsar-cream)] p-7 sm:p-8 space-y-6 shadow-xl border border-[var(--avsar-line)] rounded-3xl">
                                    <div className="text-xs uppercase tracking-[0.25em] opacity-60 font-semibold">
                                        Order Summary
                                    </div>

                                    <div className="space-y-3 text-sm text-[#101014]">
                                        <div className="flex justify-between items-baseline">
                                            <span className="opacity-80">
                                                Standard Plan ({isAnnual ? "12 Months" : "1 Month"})
                                            </span>
                                            <span className="font-serif text-lg mono font-semibold">
                                                ₹{amountRupees.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs opacity-75">
                                            <span>Professional Fee Commission</span>
                                            <span className="font-semibold text-emerald-800">0% (Keep 100%)</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs opacity-75">
                                            <span>Standby Handling Fee</span>
                                            <span>₹50 flat (billed to patient)</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs opacity-75 pb-3 border-b border-[var(--avsar-line)]">
                                            <span>Priority Pass Auto-Credits</span>
                                            <span className="font-semibold">Included</span>
                                        </div>
                                        <div className="flex justify-between items-baseline pt-1">
                                            <span className="font-serif text-xl font-medium">Total Due Today</span>
                                            <span className="font-serif text-3xl sm:text-4xl mono font-bold text-[#101014]">
                                                ₹{amountRupees.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Failure Alert */}
                                    {stage === "failed" && errorMsg && (
                                        <div
                                            className="p-4 rounded-xl text-xs sm:text-sm"
                                            style={{ background: "#FFE4E4", color: "#5A0E0E" }}
                                            data-testid="subscription-failed-msg"
                                        >
                                            <b>Payment did not complete.</b>
                                            <div className="opacity-80 mt-1">{errorMsg}</div>
                                            <button
                                                type="button"
                                                onClick={resetFlow}
                                                className="mt-2 text-xs font-semibold underline flex items-center gap-1"
                                            >
                                                <RefreshCw className="w-3 h-3" /> Try again
                                            </button>
                                        </div>
                                    )}

                                    {/* Confirming Message */}
                                    {stage === "confirming" && (
                                        <div
                                            className="p-4 rounded-xl text-xs sm:text-sm bg-[var(--avsar-pale-yellow)]"
                                            data-testid="subscription-confirming-msg"
                                        >
                                            <b>Activating subscription…</b>
                                            <div className="opacity-80 mt-1">
                                                Linking business account. Please keep this tab open.
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="space-y-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={handleRazorpay}
                                            disabled={stage === "gateway" || stage === "confirming"}
                                            data-testid="btn-pay-subscription"
                                            className="avsar-pill avsar-pill-primary w-full"
                                            style={{ height: 52, fontSize: 16 }}
                                        >
                                            {stage === "gateway" || stage === "confirming"
                                                ? "Connecting to gateway…"
                                                : `Pay ₹${amountRupees.toLocaleString("en-IN")} with Razorpay`}
                                        </button>

                                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--avsar-line)]">
                                            <button
                                                type="button"
                                                onClick={() => handleMockPay(false)}
                                                disabled={stage === "gateway" || stage === "confirming"}
                                                data-testid="btn-mock-sub-pay"
                                                className="avsar-pill avsar-pill-secondary"
                                                style={{ height: 36, minWidth: 0, padding: "0 14px", fontSize: 12 }}
                                                title="Instant 1-Click test activation"
                                            >
                                                Instant Test Pay (1-Click)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMockPay(true)}
                                                disabled={stage === "gateway" || stage === "confirming"}
                                                className="text-xs opacity-60 hover:opacity-100 hover:text-red-700 transition-colors"
                                            >
                                                Simulate card decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function SuccessView({ data, onClose, interval }) {
    const clinicId = data?.clinicId || "demo_business";
    const txnId = data?.transactionId || "sub_txn_demo";
    const expiresAtFormatted = data?.expiresAt ? new Date(data.expiresAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "30 days from now";

    return (
        <div className="max-w-2xl mx-auto text-center py-6 space-y-8">
            <div>
                <div className="text-xs uppercase tracking-[0.25em] opacity-60 font-semibold mb-2">
                    Active Subscription
                </div>
                <h2 className="font-serif text-4xl sm:text-5xl text-[#101014]">
                    Standard plan activated.
                </h2>
                <p className="opacity-80 text-base mt-3 max-w-lg mx-auto">
                    Your clinic now has unlimited standby broadcasts, 14-day priority pass credits, and full cancellation revenue analytics.
                </p>
            </div>

            <div className="p-6 rounded-3xl bg-[var(--avsar-cream)] space-y-3 text-sm text-left max-w-md mx-auto border border-[var(--avsar-line)] shadow-sm">
                <div className="flex justify-between">
                    <span className="opacity-60">Transaction Reference:</span>
                    <span className="mono font-semibold">{txnId}</span>
                </div>
                <div className="flex justify-between">
                    <span className="opacity-60">Plan:</span>
                    <span className="font-medium">{interval === "annual" ? "Standard Annual (₹19,190/yr)" : "Standard Monthly (₹1,999/mo)"}</span>
                </div>
                <div className="flex justify-between">
                    <span className="opacity-60">Valid Until:</span>
                    <span className="mono">{expiresAtFormatted}</span>
                </div>
            </div>

            <div className="pt-4 flex justify-center gap-4 flex-wrap">
                <a
                    href={`/dashboard/${clinicId}`}
                    className="avsar-pill avsar-pill-primary"
                    style={{ textDecoration: "none", height: 50, fontSize: 15, padding: "0 28px" }}
                >
                    Open Business Dashboard
                </a>
                <button
                    type="button"
                    onClick={onClose}
                    className="avsar-pill avsar-pill-secondary"
                    style={{ minWidth: 120, height: 50, fontSize: 15 }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
