import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
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

        setTimeout(() => {
            setStatus("success");
            setEmail("");
        }, 500);
    };

    return (
        <footer
            className="avsar-section section-bg-ink relative overflow-hidden"
            data-testid="footer"
            style={{ padding: "40px 36px", marginBottom: 24 }}
        >
            <div className="max-w-5xl mx-auto">
                {/* ── TOP NEWSLETTER & SCENIC CARD BANNER ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-2">
                    {/* Left: Kicker, Heading, Subtitle & Subscription */}
                    <div className="lg:col-span-7">
                        <div className="text-xs uppercase tracking-[0.25em] opacity-60 mb-2">
                            Stay ahead with Avsar
                        </div>

                        <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight leading-snug mb-2">
                            Turn last-minute openings into bookings.
                        </h2>

                        <p className="text-sm opacity-75 max-w-lg leading-relaxed mb-5">
                            Join hundreds of clinics and service businesses recovering standby revenue from cancellations every day. Zero spam, 100% opt-in.
                        </p>

                        {/* Subscription Form */}
                        <form onSubmit={handleSubscribe} className="max-w-md">
                            <AnimatePresence mode="wait">
                                {status === "success" ? (
                                    <motion.div
                                        key="success-box"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="flex items-center gap-2.5 py-2 px-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span className="font-medium">You're on the list! We'll keep you posted.</span>
                                        <button
                                            type="button"
                                            onClick={() => setStatus("idle")}
                                            className="ml-auto underline text-xs text-emerald-300 hover:text-white"
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
                                        className="space-y-1.5"
                                    >
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                            <div className="relative flex-1">
                                                <Mail className="w-3.5 h-3.5 opacity-40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => {
                                                        setEmail(e.target.value);
                                                        if (status === "error") setStatus("idle");
                                                    }}
                                                    placeholder="Enter your email"
                                                    aria-label="Email address"
                                                    className="w-full pl-9 pr-3 py-2 rounded-full bg-white/[0.07] border border-white/15 text-sm text-[var(--avsar-cream)] placeholder:opacity-40 focus:outline-none focus:border-white/30 transition-colors"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={status === "loading"}
                                                className="px-5 py-2 rounded-full bg-[var(--avsar-cream)] text-[var(--avsar-ink)] font-semibold text-xs sm:text-sm hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60"
                                            >
                                                {status === "loading" ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <span>Subscribe Now</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        {status === "error" && (
                                            <p className="text-xs text-rose-400 pl-3">
                                                {errorMessage}
                                            </p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>

                    {/* Right: Compact Layered Scenic Card */}
                    <div className="lg:col-span-5 flex justify-start lg:justify-end">
                        <div className="relative w-full max-w-[290px] sm:max-w-[320px] group">
                            {/* Tilted back card */}
                            <div className="absolute inset-0 transform -rotate-2 scale-[0.98] rounded-2xl bg-white/[0.04] border border-white/10 pointer-events-none transition-transform duration-300 group-hover:-rotate-3" />

                            {/* Main front image card */}
                            <div className="relative rounded-xl overflow-hidden border border-white/15 shadow-xl bg-neutral-900">
                                <img
                                    src={footerNatureImg || "/footer-nature.jpg"}
                                    alt="Serene scenic landscape"
                                    className="w-full h-[145px] sm:h-[160px] object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[11px] text-white/90">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>Peace of mind for your practice</span>
                                    </div>
                                    <span className="text-[10px] opacity-70 px-2 py-0.5 rounded bg-black/40 border border-white/10 hidden sm:inline-block">
                                        Consent-First
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── DIVIDER ── */}
                <div className="my-8 border-t border-white/10" />

                {/* ── LOWER NAVIGATION COLUMNS (SITE-CONSISTENT) ── */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <div className="font-serif text-2xl font-bold tracking-tight mb-2">
                            Avsar
                        </div>
                        <p className="text-sm opacity-75 max-w-[240px] leading-relaxed">
                            Standby appointments for service businesses in India. Consent-first, flat-fee, single-winner checkout.
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300 opacity-90">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            <span>All systems operational · 0% take rate</span>
                        </div>
                    </div>

                    <FooterCol
                        title="Product"
                        links={[
                            ["How it works", "#how"],
                            ["ROI calculator", "#roi"],
                            ["Pricing", "#pricing"],
                            ["Compliance", "#compliance"],
                        ]}
                    />

                    <FooterCol
                        title="Support"
                        links={[
                            ["Demo dashboard", "/dashboard/demo_business"],
                            ["Docs (OpenAPI)", "/api/openapi.json"],
                            ["WhatsApp Rules", "#compliance"],
                        ]}
                    />

                    <div>
                        <div className="text-sm font-semibold mb-3 opacity-90">Company</div>
                        <ul className="space-y-2 text-sm opacity-75">
                            <li>hello@avsar.in</li>
                            <li>+91 99000 00001</li>
                            <li>Indiranagar, Bengaluru</li>
                        </ul>
                    </div>
                </div>

                {/* ── SUB-FOOTER BOTTOM BAR ── */}
                <div className="mt-8 pt-5 border-t border-white/10 text-xs opacity-60 flex flex-wrap gap-4 justify-between">
                    <span>© {new Date().getFullYear()} Avsar. Built for Indian service businesses.</span>
                    <div className="flex items-center gap-3">
                        <span>Phase-1 demo build</span>
                        <span>•</span>
                        <span>Razorpay test mode</span>
                        <span>•</span>
                        <span>DPDP Act compliant</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterCol({ title, links }) {
    return (
        <div>
            <div className="text-sm font-semibold mb-3 opacity-90">{title}</div>
            <ul className="space-y-2 text-sm opacity-75">
                {links.map(([label, href]) => (
                    <li key={label}>
                        <a href={href} className="hover:opacity-100 transition-opacity">
                            {label}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
