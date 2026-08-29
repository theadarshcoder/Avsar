import { useMemo, useRef, useState } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import SliderGroup from "../components/roi/SliderGroup";
import BleedOutputBox from "../components/roi/BleedOutputBox";
import VacancyMockup from "../components/mockups/VacancyMockup";
import WhatsAppMockup from "../components/mockups/WhatsAppMockup";
import CheckoutMockup from "../components/mockups/CheckoutMockup";

export default function Home() {
    const [values, setValues] = useState({
        chairs: 2,
        hourlyRate: 2000,
        cancellations: 8,
    });
    const roiRef = useRef(null);

    // Business rule: math is illustrative marketing math. Not price math.
    const monthlyBleed = useMemo(
        () => values.cancellations * values.hourlyRate * 4,
        [values]
    );
    const recoverable = useMemo(() => monthlyBleed * 0.8, [monthlyBleed]);

    const scrollToRoi = () => {
        roiRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div>
            <Nav />

            {/* ── Hero ────────────────────────────────────────────────── */}
            <section
                className="doctro-section"
                style={{ background: "#FFFFFF", marginTop: 12 }}
                data-testid="hero"
            >
                <div className="max-w-5xl mx-auto pt-6">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-60 mb-4">
                        For dental clinics in India
                    </div>
                    <h1
                        data-testid="hero-headline"
                        className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight"
                    >
                        Turn last-minute clinic cancellations into instant standby revenue.
                    </h1>
                    <p className="mt-6 text-base sm:text-lg max-w-2xl opacity-80">
                        When a patient cancels, doctro notifies your consented waitlist over
                        WhatsApp and runs a locked, single-winner checkout — so one paying
                        patient replaces the empty chair, automatically. No calls, no
                        double-bookings, no percentage cuts.
                    </p>
                    <div className="mt-8 flex gap-4 flex-wrap">
                        <button
                            data-testid="hero-cta-roi"
                            onClick={scrollToRoi}
                            className="doctro-pill doctro-pill-primary"
                        >
                            See what cancellations cost you
                        </button>
                        <a
                            data-testid="hero-cta-demo"
                            href="/dashboard/clinic_smile_dental_indiranagar"
                            className="doctro-pill doctro-pill-secondary"
                        >
                            Open the demo dashboard
                        </a>
                    </div>
                </div>
            </section>

            {/* ── ROI Calculator ─────────────────────────────────────── */}
            <section
                id="roi"
                ref={roiRef}
                className="doctro-section section-bg-cream"
                data-testid="roi-section"
            >
                <div className="max-w-5xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                        The cost of an empty chair
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-8">
                        What are cancellations costing you every month?
                    </h2>
                    <SliderGroup
                        chairs={values.chairs}
                        hourlyRate={values.hourlyRate}
                        cancellations={values.cancellations}
                        onChange={setValues}
                    />
                    <BleedOutputBox
                        monthlyBleed={monthlyBleed}
                        recoverable={recoverable}
                    />
                </div>
            </section>

            {/* ── How it works — 3 mockups ───────────────────────────── */}
            <div id="how">
                <ExplainerSection
                    tone="lavender"
                    order="left"
                    kicker="Step 1 · Flag the vacancy"
                    title="The moment a chair opens up, doctro flags it."
                    body="You cancel a slot in one tap — or your scheduling software tells us. Doctro doesn't need a percentage of the fee. It just needs to know when a chair is idle."
                    mockup={<VacancyMockup />}
                />
                <ExplainerSection
                    tone="teal"
                    order="right"
                    kicker="Step 2 · Notify the waitlist"
                    title="A WhatsApp message goes only to patients who opted in."
                    body="Non-consented patients are skipped at the query level, not just hidden in the UI. And the message never contains a price, a discount, or a standby rate — only the slot, the doctor, and a link to the priority page."
                    mockup={<WhatsAppMockup />}
                />
                <ExplainerSection
                    tone="peach"
                    order="left"
                    kicker="Step 3 · Locked, single-winner checkout"
                    title="One atomic operation. One winner. Everyone else is refunded."
                    body="Two patients tapping pay at the same second? Only one is locked in. The other gets a clear message — 'this slot was just taken' — and their money is automatically refunded. No manual reconciliation."
                    mockup={<CheckoutMockup />}
                />
            </div>

            {/* ── Dashboard preview strip ───────────────────────────── */}
            <section
                className="doctro-section section-bg-yellow"
                data-testid="preview-section"
            >
                <div className="max-w-5xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                        Your dashboard
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-6">
                        Watch cancellations become bookings in real time.
                    </h2>
                    <p className="text-base opacity-80 max-w-2xl mb-6">
                        Every recovered slot appears in your dashboard within seconds. See
                        the day's standby revenue at a glance, and click into any slot to
                        see who was notified.
                    </p>
                    <a
                        href="/dashboard/clinic_smile_dental_indiranagar"
                        className="doctro-pill doctro-pill-primary"
                        data-testid="cta-open-demo-dashboard"
                    >
                        Open the demo dashboard
                    </a>
                </div>
            </section>

            {/* ── Pricing ───────────────────────────────────────────── */}
            <section
                id="pricing"
                className="doctro-section"
                style={{ background: "#FFFFFF" }}
                data-testid="pricing-section"
            >
                <div className="max-w-5xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-60">
                        Pricing
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-8">
                        Flat monthly. Flat handling fee. No percentage cuts, ever.
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PricingCard
                            testid="pricing-trial"
                            name="Free trial"
                            perMonth="₹0"
                            handling="₹50 flat"
                            limit="up to 10 standby slots per month"
                            features={[
                                "Consent-first waitlist",
                                "WhatsApp notifications",
                                "Locked single-winner checkout",
                            ]}
                        />
                        <PricingCard
                            testid="pricing-paid"
                            highlight
                            name="Standard"
                            perMonth="₹1,999"
                            handling="₹50 flat"
                            limit="unlimited standby slots"
                            features={[
                                "Everything in Free",
                                "Priority pass credits (14-day)",
                                "Refund-or-credit patient flow",
                                "Analytics dashboard",
                            ]}
                        />
                    </div>
                    <p className="text-xs opacity-70 mt-6 italic max-w-2xl">
                        The subscription and the ₹50 handling fee are shown as separate line
                        items on purpose — we never combine them into a single number, and
                        neither is a percentage of your consultation fee.
                    </p>
                </div>
            </section>

            {/* ── Compliance ────────────────────────────────────────── */}
            <section
                id="compliance"
                className="doctro-section"
                style={{ background: "#FFFFFF" }}
                data-testid="compliance-section"
            >
                <div className="max-w-5xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-60">
                        Design choices, not legal guarantees
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-8">
                        Three product choices we made on purpose.
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ComplianceCard
                            testid="compliance-1"
                            title="No prices in WhatsApp"
                            body="Templates never include a price, discount, or standby rate. Pricing is visible only on the checkout page after a patient taps the link."
                        />
                        <ComplianceCard
                            testid="compliance-2"
                            title="Flat subscription"
                            body="We charge a flat monthly fee, not a percentage of your consultation. What your clinic earns from a slot is your clinic's business."
                        />
                        <ComplianceCard
                            testid="compliance-3"
                            title="Consent at booking"
                            body="A patient must have a timestamped consent record to receive any standby message. Enforced at the database query — not at the UI."
                        />
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

function ExplainerSection({ tone, order, kicker, title, body, mockup }) {
    const bgClass = {
        lavender: "section-bg-lavender",
        teal: "section-bg-teal",
        peach: "section-bg-peach",
    }[tone];
    const reverse = order === "right";
    return (
        <section
            className={`doctro-section ${bgClass}`}
            data-testid={`explainer-${tone}`}
        >
            <div
                className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${
                    reverse ? "md:flex-row-reverse" : ""
                }`}
            >
                <div className={reverse ? "md:order-2" : ""}>
                    <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                        {kicker}
                    </div>
                    <h3 className="font-serif text-3xl sm:text-4xl mt-2 leading-tight">
                        {title}
                    </h3>
                    <p className="mt-4 text-base opacity-85 max-w-lg">{body}</p>
                </div>
                <div className={`flex ${reverse ? "md:order-1 md:justify-start" : "md:justify-end"} justify-center`}>
                    {mockup}
                </div>
            </div>
        </section>
    );
}

function PricingCard({ testid, name, perMonth, handling, limit, features, highlight }) {
    return (
        <div
            data-testid={testid}
            className={`doctro-card ${highlight ? "ring-1 ring-[var(--doctro-ink)]" : ""}`}
        >
            <div className="text-sm font-semibold opacity-70">{name}</div>
            <div className="mt-3">
                <div className="text-xs uppercase tracking-widest opacity-60">
                    Subscription
                </div>
                <div className="font-serif text-4xl mono" data-testid={`${testid}-monthly`}>
                    {perMonth}
                    <span className="text-base opacity-60 ml-1">/month</span>
                </div>
            </div>
            <div className="mt-4">
                <div className="text-xs uppercase tracking-widest opacity-60">
                    Handling fee per checkout
                </div>
                <div className="font-serif text-2xl mono" data-testid={`${testid}-handling`}>
                    {handling}
                </div>
                <div className="text-[11px] opacity-60 mt-1">
                    charged to the standby patient, not to the clinic
                </div>
            </div>
            <div className="mt-4 text-sm opacity-80">{limit}</div>
            <ul className="mt-4 space-y-2 text-sm opacity-85">
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--doctro-ink)]" />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ComplianceCard({ testid, title, body }) {
    return (
        <div data-testid={testid} className="doctro-card">
            <div className="text-2xl mb-2 font-serif">{title}</div>
            <p className="text-sm opacity-80">{body}</p>
        </div>
    );
}
