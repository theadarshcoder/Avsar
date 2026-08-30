import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, ArrowLeft, ArrowRight, Check, Sparkles, Lock } from "lucide-react";
import { startFreeTrial } from "../../lib/apiClient";

export default function TrialModal({ isOpen, onClose }) {
    const [clinicName, setClinicName] = useState("Acme Center, Downtown");
    const [providerName, setProviderName] = useState("Alex Carter");
    const [email, setEmail] = useState("demo@acmecenter.in");
    const [phone, setPhone] = useState("+919900000001");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successData, setSuccessData] = useState(null);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        try {
            const res = await startFreeTrial({
                clinicName,
                email,
                phone,
                standbyAdjustment: 400,
                chairs: 1,
            });
            setSuccessData(res);
        } catch (err) {
            const d = err?.response?.data?.detail;
            setErrorMsg(typeof d === "string" ? d : d?.message || err?.message || "Trial activation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#FFFFFF] flex flex-col overflow-y-auto"
            data-testid="trial-fullscreen-modal"
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
                        avsar<span className="font-sans font-normal text-xs opacity-60 ml-2">free trial</span>
                    </span>
                </div>

                <div className="flex items-center gap-4">
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
                <div className="w-full max-w-5xl">
                    {successData ? (
                        <div className="max-w-xl mx-auto text-center py-8 space-y-6">
                            <div>
                                <div className="text-xs uppercase tracking-[0.25em] opacity-60 font-semibold mb-2">
                                    Trial Active
                                </div>
                                <h2 className="font-serif text-4xl sm:text-5xl text-[#101014]">
                                    Your 14-day trial is ready.
                                </h2>
                                <p className="opacity-80 text-base mt-3 max-w-md mx-auto">
                                    You have 14 days and up to 10 standby slot broadcasts to see cancellations turn into instant bookings.
                                </p>
                            </div>
                            <div className="pt-4 flex justify-center">
                                <a
                                    href={`/dashboard/${successData?.clinic?.id || "demo_business"}`}
                                    className="avsar-pill avsar-pill-primary"
                                    style={{ textDecoration: "none", height: 50, fontSize: 15, padding: "0 32px" }}
                                >
                                    Open Demo Dashboard <ArrowRight className="w-4 h-4 ml-1 inline" />
                                </a>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                            {/* Left Side (7 Cols) */}
                            <div className="lg:col-span-7 space-y-6">
                                <div>
                                    <div className="text-xs uppercase tracking-[0.25em] opacity-60 font-semibold">
                                        14-Day Free Access
                                    </div>
                                    <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#101014] mt-2 mb-2 leading-tight">
                                        Start Your Business Trial
                                    </h1>
                                    <p className="opacity-75 text-sm sm:text-base leading-relaxed max-w-lg">
                                        Test automatic cancellation broadcasts on WhatsApp with zero credit card required.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider opacity-60 mb-1 font-medium">
                                                Business Name
                                            </label>
                                            <input
                                                type="text"
                                                required
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
                                                required
                                                value={providerName}
                                                onChange={(e) => setProviderName(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--avsar-line)] focus:outline-none focus:border-[var(--avsar-ink)] text-sm font-body"
                                                placeholder="Alex Carter"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider opacity-60 mb-1 font-medium">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--avsar-line)] focus:outline-none focus:border-[var(--avsar-ink)] text-sm font-body"
                                                placeholder="demo@acmecenter.in"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider opacity-60 mb-1 font-medium">
                                                Phone / WhatsApp
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--avsar-line)] focus:outline-none focus:border-[var(--avsar-ink)] text-sm font-body mono"
                                                placeholder="+919900000001"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {errorMsg && (
                                    <div
                                        className="p-4 rounded-xl text-sm"
                                        style={{ background: "#FFE4E4", color: "#5A0E0E" }}
                                    >
                                        <b>Unable to activate trial:</b>
                                        <div className="opacity-80 mt-1">{errorMsg}</div>
                                    </div>
                                )}
                            </div>

                            {/* Right Side (5 Cols) */}
                            <div className="lg:col-span-5">
                                <div className="avsar-card bg-[var(--avsar-cream)] p-7 sm:p-8 space-y-6 shadow-xl border border-[var(--avsar-line)] rounded-3xl">
                                    <div className="text-xs uppercase tracking-[0.25em] opacity-60 font-semibold">
                                        Included In Free Trial
                                    </div>

                                    <div className="space-y-3 text-sm opacity-85">
                                        <div className="flex items-start gap-3">
                                            <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                                            <span>Up to 10 standby slot broadcasts</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                                            <span>Consent-first WhatsApp waitlist</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                                            <span>Locked single-winner atomic checkout</span>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                                            <span>Live message delivery tracking</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-[var(--avsar-line)]">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            data-testid="btn-submit-trial"
                                            className="avsar-pill avsar-pill-primary w-full"
                                            style={{ height: 52, fontSize: 16 }}
                                        >
                                            {loading ? "Activating Trial…" : "Start 14-Day Free Trial"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
