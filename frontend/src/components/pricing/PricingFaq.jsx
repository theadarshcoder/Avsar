import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

export default function PricingFaq() {
    const faqs = [
        {
            q: "How does the ₹50 handling fee work?",
            a: "The ₹50 handling fee is charged directly to the standby patient during the priority checkout step. It is never deducted from your clinic or consultation revenue. You receive 100% of your set standby consultation fee.",
        },
        {
            q: "Do you take any percentage cuts from our doctor consultations?",
            a: "Never. Doctro operates strictly as a flat monthly subscription. Whether a consultation is ₹800 or ₹15,000, Doctro takes 0% cut. What your clinic earns from a slot is your clinic's business.",
        },
        {
            q: "How does the single-winner atomic checkout lock work?",
            a: "When a slot opens up and multiple waitlist patients tap pay simultaneously, our atomic database lock guarantees that exactly one patient wins the slot. The other patient is immediately refunded with zero manual reconciliation required by your staff.",
        },
        {
            q: "Can I switch between monthly and annual billing?",
            a: "Yes. You can switch between monthly and annual billing at any time. The annual plan gives you a 20% discount (₹1,599/month billed annually at ₹19,190/year).",
        },
        {
            q: "Why are prices not included in the WhatsApp notification?",
            a: "Per healthcare marketing guidelines and clinical standards, standby notification templates contain only the appointment time, doctor name, and a secure priority checkout link. The fee is visible only when the patient taps through to the checkout page.",
        },
        {
            q: "What happens after the 14-day free trial?",
            a: "You can use up to 10 standby slot broadcasts during your 14-day trial with no credit card required. When you're ready, upgrade to Standard for unlimited slots and priority pass management.",
        },
    ];

    const [openIndex, setOpenIndex] = useState(0);

    const toggle = (idx) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <div className="mt-20 pt-16 border-t border-[var(--doctro-line)]" data-testid="pricing-faq-section">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-60">
                        Frequent questions
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-3 text-[#101014]">
                        Clear answers on pricing, fees, and locking.
                    </h2>
                    <p className="text-sm opacity-80 max-w-xl">
                        Everything dental clinic owners and practice managers ask about how Doctro charges and operates.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <div
                                key={faq.q}
                                className={`doctro-card transition-all duration-200 cursor-pointer ${
                                    isOpen ? "ring-1 ring-[var(--doctro-ink)]" : "hover:border-black/15"
                                }`}
                                onClick={() => toggle(idx)}
                                style={{ padding: "20px 24px" }}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="font-serif text-xl sm:text-2xl text-[#101014] select-none">
                                        {faq.q}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-[var(--doctro-cream)] flex items-center justify-center shrink-0 text-[#101014]">
                                        {isOpen ? (
                                            <Minus className="w-4 h-4 stroke-[2.5]" />
                                        ) : (
                                            <Plus className="w-4 h-4 stroke-[2.5]" />
                                        )}
                                    </div>
                                </div>
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <p className="mt-4 pt-4 border-t border-[var(--doctro-line)] text-sm opacity-80 leading-relaxed text-[#101014]">
                                                {faq.a}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
