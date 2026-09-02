import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Zap,
    ShieldCheck,
    Loader2,
} from "lucide-react";
import footerNatureImg from "../assets/footer-nature.jpg";

export default function Footer() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle"); // idle | loading | success | error
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (!email || !email.includes("@")) {
            setErrorMessage("Please enter a valid email address.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setErrorMessage("");

        // Simulated quick subscription feedback
        setTimeout(() => {
            setStatus("success");
            setEmail("");
        }, 600);
    };

    return (
        <footer
            className="avsar-section section-bg-ink relative overflow-hidden"
            data-testid="footer"
            style={{ marginBottom: 24 }}
        >
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* ── TOP NEWSLETTER / FEATURE BANNER ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center pt-2 pb-6">
                    {/* Left: Headline & Email Subscription */}
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.08] border border-white/15 text-xs uppercase tracking-widest text-white/90 mb-5 backdrop-blur-md">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Stay Ahead With Avsar</span>
                        </div>

                        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15] mb-4">
                            Stay ahead with Avsar.
                        </h2>

                        <p className="text-sm sm:text-base text-white/75 max-w-xl leading-relaxed mb-8">
                            Join hundreds of clinics and service businesses recovering standby revenue from cancellations every day. Zero spam, 100% opt-in.
                        </p>

                        {/* Interactive Email Subscription Form */}
                        <form
                            onSubmit={handleSubscribe}
                            className="max-w-md relative"
                        >
                            <AnimatePresence mode="wait">
                                {status === "success" ? (
                                    <motion.div
                                        key="success-box"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm"
                                    >
                                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                                        <div className="flex-1">
                                            <span className="font-semibold text-white">You're on the list!</span>
                                            <p className="text-xs text-emerald-300/80 mt-0.5">
                                                We'll send updates on new booking automations.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStatus("idle")}
                                            className="text-xs underline text-emerald-300 hover:text-white ml-2"
                                        >
                                            Reset
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="form-box"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                            <div className="relative flex-1">
                                                <Mail className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => {
                                                        setEmail(e.target.value);
                                                        if (status === "error") setStatus("idle");
                                                    }}
                                                    placeholder="Enter your email"
                                                    aria-label="Email address for updates"
                                                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.07] border border-white/15 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={status === "loading"}
                                                className="px-6 py-3.5 rounded-2xl bg-white text-[#101014] font-semibold text-sm hover:bg-neutral-100 hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-70 shadow-sm"
                                            >
                                                {status === "loading" ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Subscribing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Subscribe Now</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        {status === "error" && (
                                            <p className="text-xs text-rose-400 pl-2">
                                                {errorMessage}
                                            </p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>

                    {/* Right: Layered 3D Scenic Card */}
                    <div className="lg:col-span-5 flex justify-center lg:justify-end">
                        <div className="relative w-full max-w-[380px] sm:max-w-[420px] group">
                            {/* Layer 1: Tilted background card */}
                            <div className="absolute inset-0 transform -rotate-3 scale-[0.98] rounded-3xl bg-white/[0.04] border border-white/10 shadow-2xl transition-transform duration-500 group-hover:-rotate-4 group-hover:scale-[0.99] pointer-events-none" />

                            {/* Layer 2: Main Image Card with glow and reflection */}
                            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-neutral-900 group">
                                <img
                                    src={footerNatureImg || "/footer-nature.jpg"}
                                    alt="Scenic mountain valley at sunrise representing calm and automated scheduling"
                                    className="w-full h-[220px] sm:h-[260px] object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                />

                                {/* Subtle gradient vignette over image */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                                {/* Floating glass pill badge */}
                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs text-white/90">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>Peace of Mind for Your Practice</span>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/70 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
                                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                        <span>Consent-First</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── DELICATE DIVIDER ── */}
                <div className="my-12 border-t border-white/[0.09]" />

                {/* ── LOWER NAVIGATION & BRAND DETAILS ── */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    {/* Brand Emblem & Tagline */}
                    <div className="md:col-span-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-full bg-white text-[#101014] flex items-center justify-center shadow-md font-bold">
                                <Zap className="w-4 h-4 fill-current text-[#101014]" />
                            </div>
                            <span className="font-serif text-2xl font-bold tracking-tight text-white">
                                Avsar
                            </span>
                        </div>
                        <p className="text-sm text-white/70 max-w-[280px] leading-relaxed">
                            Standby appointments for service businesses in India. Consent-first, flat-fee, single-winner atomic checkout.
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            <span>All Systems Operational · 0% Take Rate</span>
                        </div>
                    </div>

                    {/* Solutions Column */}
                    <div className="md:col-span-3">
                        <div className="text-sm font-semibold mb-4 text-white/95 uppercase tracking-wider text-xs">
                            Solutions
                        </div>
                        <ul className="space-y-2.5 text-sm text-white/70">
                            {[
                                ["How it works", "#how"],
                                ["ROI calculator", "#roi"],
                                ["Standby Broadcasts", "#compliance"],
                                ["Pricing & Plans", "#pricing"],
                            ].map(([label, href]) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        className="hover:text-white transition-colors duration-150 inline-block"
                                    >
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Column */}
                    <div className="md:col-span-3">
                        <div className="text-sm font-semibold mb-4 text-white/95 uppercase tracking-wider text-xs">
                            Resources
                        </div>
                        <ul className="space-y-2.5 text-sm text-white/70">
                            {[
                                ["Demo Dashboard", "/dashboard/demo_business"],
                                ["Docs (OpenAPI)", "/api/openapi.json"],
                                ["WhatsApp Template Rules", "#compliance"],
                                ["Single-Winner Checkout", "#compliance"],
                            ].map(([label, href]) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        className="hover:text-white transition-colors duration-150 inline-block"
                                    >
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company & Contact Column */}
                    <div className="md:col-span-2">
                        <div className="text-sm font-semibold mb-4 text-white/95 uppercase tracking-wider text-xs">
                            Company
                        </div>
                        <ul className="space-y-2.5 text-sm text-white/70">
                            <li>
                                <a
                                    href="mailto:hello@avsar.in"
                                    className="hover:text-white transition-colors duration-150"
                                >
                                    hello@avsar.in
                                </a>
                            </li>
                            <li>
                                <a
                                    href="tel:+919900000001"
                                    className="hover:text-white transition-colors duration-150"
                                >
                                    +91 99000 00001
                                </a>
                            </li>
                            <li className="text-white/60">
                                Indiranagar, Bengaluru
                            </li>
                            <li className="pt-1">
                                <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white/80">
                                    Karnataka, IN
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* ── SUB-FOOTER BOTTOM BAR ── */}
                <div className="mt-12 pt-6 border-t border-white/[0.08] text-xs text-white/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span>
                        © {new Date().getFullYear()} Avsar Technologies. Built for Indian service businesses.
                    </span>
                    <div className="flex items-center gap-4 text-white/60">
                        <span>Phase-1 Demo Build</span>
                        <span>•</span>
                        <span>Razorpay Test Active</span>
                        <span>•</span>
                        <span>DPDP Act Compliant</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
