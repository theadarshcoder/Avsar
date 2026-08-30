import { useMemo, useRef, useState } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import SliderGroup from "../components/roi/SliderGroup";
import BleedOutputBox from "../components/roi/BleedOutputBox";
import VacancyMockup from "../components/mockups/VacancyMockup";
import WhatsAppMockup from "../components/mockups/WhatsAppMockup";
import CheckoutMockup from "../components/mockups/CheckoutMockup";
import PricingSection from "../components/pricing/PricingSection";

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
            {/* Hero*/}
            <section
                className="avsar-section"
                style={{ background: "#FFFFFF", marginTop: 12 }}
                data-testid="hero"
            >
                <div className="max-w-5xl mx-auto pt-6">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-60 mb-4">
                        For service businesses in India
                    </div>
                    <h1
                        data-testid="hero-headline"
                        className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight"
                    >
                        Turn last-minute cancellations into instant standby revenue.
                    </h1>
                    <p className="mt-6 text-base sm:text-lg max-w-2xl opacity-80">
                        When a customer cancels, Avsar automatically texts your waitlist via WhatsApp to offer them the open spot. The first person to book claims it instantly. Keep your schedule full without making phone calls or paying heavy commissions.
                    </p>
                    <div className="mt-8 flex gap-4 flex-wrap">
                        <button
                            data-testid="hero-cta-roi"
                            onClick={scrollToRoi}
                            className="avsar-pill avsar-pill-primary"
                        >
                            See what cancellations cost you
                        </button>
                        <a
                            data-testid="hero-cta-login"
                            href="/login"
                            className="avsar-pill avsar-pill-secondary"
                        >
                            Business login
                        </a>
                    </div>
                </div>
            </section>

            {/* ROI Calculator*/}
            <section
                id="roi"
                ref={roiRef}
                className="avsar-section section-bg-cream"
                data-testid="roi-section"
            >
                <div className="max-w-5xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                        The cost of an empty slot
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

            {/* How it works: 3 mockups */}
            <div id="how">
                <ExplainerSection
                    tone="lavender"
                    order="left"
                    kicker="Step 1 · Mark the opening"
                    title="Instantly free up a cancelled slot."
                    body="When a customer cancels, just tap a button to mark the time slot as available. Avsar immediately gets to work filling that empty spot so you don't lose money."
                    mockup={<VacancyMockup />}
                />
                <ExplainerSection
                    tone="teal"
                    order="right"
                    kicker="Step 2 · Message your waitlist"
                    title="Automatic alerts sent via WhatsApp."
                    body="Avsar sends a friendly WhatsApp message to your waitlist letting them know a spot just opened up. We only message customers who have asked to be notified, keeping everything professional and spam-free."
                    mockup={<WhatsAppMockup />}
                />
                <ExplainerSection
                    tone="peach"
                    order="left"
                    kicker="Step 3 · Secure the booking"
                    title="First to book gets the spot."
                    body="When multiple customers try to claim the spot, Avsar ensures only the first person gets it. Anyone who misses out is instantly notified and refunded. No double-bookings and no extra work for your staff."
                    mockup={<CheckoutMockup />}
                />
            </div>

            <section
                className="avsar-section section-bg-yellow"
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
                        href="/login"
                        className="avsar-pill avsar-pill-primary"
                        data-testid="cta-clinic-login"
                    >
                        Log in to your business dashboard
                    </a>
                </div>
            </section>

            {/* Pricing*/}
            <PricingSection />

            {/* Compliance*/}
            <section
                id="compliance"
                className="avsar-section"
                style={{ background: "#FFFFFF" }}
                data-testid="compliance-section"
            >
                <div className="max-w-5xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-60">
                        Built for trust and transparency
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-8">
                        Three product choices we made on purpose.
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ComplianceCard
                            testid="compliance-1"
                            title="No prices in WhatsApp"
                            body="Messages only show the available time and date. Customers see pricing details only when they click the secure booking link."
                        />
                        <ComplianceCard
                            testid="compliance-2"
                            title="Flat subscription"
                            body="We charge a flat monthly fee instead of taking a cut of your earnings. You keep 100% of your service revenue."
                        />
                        <ComplianceCard
                            testid="compliance-3"
                            title="Opt-in only messaging"
                            body="We ensure messages are only sent to customers who explicitly asked to be on your waitlist, protecting your business's reputation."
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
            className={`avsar-section ${bgClass}`}
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
            className={`avsar-card ${highlight ? "ring-1 ring-[var(--avsar-ink)]" : ""}`}
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
                    charged to the standby customer, not to the business
                </div>
            </div>
            <div className="mt-4 text-sm opacity-80">{limit}</div>
            <ul className="mt-4 space-y-2 text-sm opacity-85">
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[var(--avsar-ink)]" />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ComplianceCard({ testid, title, body }) {
    return (
        <div data-testid={testid} className="avsar-card">
            <div className="text-2xl mb-2 font-serif">{title}</div>
            <p className="text-sm opacity-80">{body}</p>
        </div>
    );
}
