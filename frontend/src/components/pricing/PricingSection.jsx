import { useState } from "react";
import { motion } from "framer-motion";
import SubscriptionModal from "./SubscriptionModal";
import TrialModal from "./TrialModal";
import PricingFaq from "./PricingFaq";

export default function PricingSection({ isStandalone = false }) {
    const [billingInterval, setBillingInterval] = useState("monthly"); // monthly | annual
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [trialModalOpen, setTrialModalOpen] = useState(false);

    const isAnnual = billingInterval === "annual";

    return (
        <section
            id="pricing"
            className="doctro-section"
            style={{ background: "#FFFFFF" }}
            data-testid="pricing-section"
        >
            <div className="max-w-5xl mx-auto">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="text-xs uppercase tracking-[0.25em] opacity-60">
                            Pricing
                        </div>
                        <h2 className="font-serif text-3xl sm:text-4xl mt-2 text-[#101014]">
                            Flat monthly. Flat handling fee. No percentage cuts, ever.
                        </h2>
                    </div>

                    {/* Cadence Toggle */}
                    <div className="inline-flex items-center p-1 rounded-full bg-[var(--doctro-cream)] border border-black/5 self-start sm:self-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => setBillingInterval("monthly")}
                            data-testid="btn-cadence-monthly"
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                !isAnnual
                                    ? "bg-[var(--doctro-ink)] text-white shadow-sm"
                                    : "text-[#101014]/70 hover:text-[#101014]"
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingInterval("annual")}
                            data-testid="btn-cadence-annual"
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                isAnnual
                                    ? "bg-[var(--doctro-ink)] text-white shadow-sm"
                                    : "text-[#101014]/70 hover:text-[#101014]"
                            }`}
                        >
                            <span>Annual</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                                -20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* 2 Authentic DOCTRO Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Free Trial Card */}
                    <div
                        data-testid="pricing-trial"
                        className="doctro-card flex flex-col justify-between"
                    >
                        <div>
                            <div className="text-sm font-semibold opacity-70">Free trial</div>
                            <div className="mt-3">
                                <div className="text-xs uppercase tracking-widest opacity-60">
                                    Subscription
                                </div>
                                <div className="font-serif text-4xl mono" data-testid="pricing-trial-monthly">
                                    ₹0
                                    <span className="text-base opacity-60 ml-1">/month</span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="text-xs uppercase tracking-widest opacity-60">
                                    Handling fee per checkout
                                </div>
                                <div className="font-serif text-2xl mono" data-testid="pricing-trial-handling">
                                    ₹50 flat
                                </div>
                                <div className="text-[11px] opacity-60 mt-1">
                                    charged to the standby patient, not to the clinic
                                </div>
                            </div>
                            <div className="mt-4 text-sm opacity-80">up to 10 standby slots per month</div>
                            <ul className="mt-4 space-y-2 text-sm opacity-85">
                                {[
                                    "Consent-first waitlist",
                                    "WhatsApp notifications",
                                    "Locked single-winner checkout",
                                ].map((f) => (
                                    <li key={f} className="flex items-start gap-2">
                                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--doctro-ink)]" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[var(--doctro-line)]">
                            <button
                                type="button"
                                onClick={() => setTrialModalOpen(true)}
                                data-testid="btn-plan-trial"
                                className="doctro-pill doctro-pill-secondary w-full"
                            >
                                Start 14-day free trial
                            </button>
                        </div>
                    </div>

                    {/* Standard Paid Card */}
                    <div
                        data-testid="pricing-paid"
                        className="doctro-card ring-1 ring-[var(--doctro-ink)] flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-center">
                                <div className="text-sm font-semibold opacity-70">Standard</div>
                                {isAnnual && (
                                    <span className="text-[11px] font-semibold bg-[var(--doctro-cream)] px-2.5 py-0.5 rounded-full">
                                        Save ₹4,798/year
                                    </span>
                                )}
                            </div>
                            <div className="mt-3">
                                <div className="text-xs uppercase tracking-widest opacity-60">
                                    Subscription
                                </div>
                                <div className="font-serif text-4xl mono" data-testid="pricing-paid-monthly">
                                    {isAnnual ? "₹1,599" : "₹1,999"}
                                    <span className="text-base opacity-60 ml-1">/month</span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="text-xs uppercase tracking-widest opacity-60">
                                    Handling fee per checkout
                                </div>
                                <div className="font-serif text-2xl mono" data-testid="pricing-paid-handling">
                                    ₹50 flat
                                </div>
                                <div className="text-[11px] opacity-60 mt-1">
                                    charged to the standby patient, not to the clinic
                                </div>
                            </div>
                            <div className="mt-4 text-sm opacity-80">unlimited standby slots</div>
                            <ul className="mt-4 space-y-2 text-sm opacity-85">
                                {[
                                    "Everything in Free",
                                    "Priority pass credits (14-day)",
                                    "Refund-or-credit patient flow",
                                    "Analytics dashboard",
                                ].map((f) => (
                                    <li key={f} className="flex items-start gap-2">
                                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--doctro-ink)]" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[var(--doctro-line)]">
                            <button
                                type="button"
                                onClick={() => setSubModalOpen(true)}
                                data-testid="btn-plan-standard"
                                className="doctro-pill doctro-pill-primary w-full"
                            >
                                Subscribe to Standard
                            </button>
                        </div>
                    </div>
                </div>

                {/* Explanatory Footnote */}
                <p className="text-xs opacity-70 mt-6 italic max-w-2xl">
                    The subscription and the ₹50 handling fee are shown as separate line
                    items on purpose — we never combine them into a single number, and
                    neither is a percentage of your consultation fee.
                </p>

                {/* Redesigned Frequent Questions UI */}
                <PricingFaq />
            </div>

            {/* Modals */}
            <SubscriptionModal
                isOpen={subModalOpen}
                onClose={() => setSubModalOpen(false)}
                initialInterval={billingInterval}
            />
            <TrialModal
                isOpen={trialModalOpen}
                onClose={() => setTrialModalOpen(false)}
            />
        </section>
    );
}
