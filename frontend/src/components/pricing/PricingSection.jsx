import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SubscriptionModal from "./SubscriptionModal";
import TrialModal from "./TrialModal";
import PricingFaq from "./PricingFaq";

export default function PricingSection({ isStandalone = false }) {
    const navigate = useNavigate();
    const [billingInterval, setBillingInterval] = useState("monthly"); // monthly | annual
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [trialModalOpen, setTrialModalOpen] = useState(false);

    const isLoggedIn = () => !!localStorage.getItem("avsar_clinic_token");

    const handleSubscribeClick = () => {
        if (!isLoggedIn()) {
            navigate("/login?redirect=pricing");
            return;
        }
        setSubModalOpen(true);
    };

    const handleTrialClick = () => {
        if (!isLoggedIn()) {
            navigate("/login?redirect=pricing");
            return;
        }
        setTrialModalOpen(true);
    };

    const isAnnual = billingInterval === "annual";

    return (
        <section
            id="pricing"
            className="avsar-section"
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
                    <div className="inline-flex items-center p-1 rounded-full bg-[var(--avsar-cream)] border border-black/5 self-start sm:self-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => setBillingInterval("monthly")}
                            data-testid="btn-cadence-monthly"
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                !isAnnual
                                    ? "bg-[var(--avsar-ink)] text-white shadow-sm"
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
                                    ? "bg-[var(--avsar-ink)] text-white shadow-sm"
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

                {/* 2 Authentic avsar Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Free Trial Card */}
                    <div
                        data-testid="pricing-trial"
                        className="avsar-card flex flex-col justify-between"
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
                                    charged to the standby customer, not to the clinic
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
                                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--avsar-ink)]" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[var(--avsar-line)]">
                            <button
                                type="button"
                                onClick={handleTrialClick}
                                data-testid="btn-plan-trial"
                                className="avsar-pill avsar-pill-secondary w-full"
                            >
                                Start 14-day free trial
                            </button>
                        </div>
                    </div>

                    {/* Standard Paid Card */}
                    <div
                        data-testid="pricing-paid"
                        className="avsar-card ring-1 ring-[var(--avsar-ink)] flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-center">
                                <div className="text-sm font-semibold opacity-70">Standard</div>
                                {isAnnual && (
                                    <span className="text-[11px] font-semibold bg-[var(--avsar-cream)] px-2.5 py-0.5 rounded-full">
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
                                    charged to the standby customer, not to the clinic
                                </div>
                            </div>
                            <div className="mt-4 text-sm opacity-80">unlimited standby slots</div>
                            <ul className="mt-4 space-y-2 text-sm opacity-85">
                                {[
                                    "Everything in Free",
                                    "Priority pass credits (14-day)",
                                    "Refund-or-credit customer flow",
                                    "Analytics dashboard",
                                ].map((f) => (
                                    <li key={f} className="flex items-start gap-2">
                                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--avsar-ink)]" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[var(--avsar-line)]">
                            <button
                                type="button"
                                onClick={handleSubscribeClick}
                                data-testid="btn-plan-standard"
                                className="avsar-pill avsar-pill-primary w-full"
                            >
                                Subscribe to Standard
                            </button>
                        </div>
                    </div>
                </div>

                {/* Explanatory Footnote */}
                <p className="text-xs opacity-70 mt-6 italic max-w-2xl">
                    The subscription and the ₹50 handling fee are shown as separate line
                    items on purpose. We never combine them into a single number, and
                    neither is a percentage of your service fee.
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
