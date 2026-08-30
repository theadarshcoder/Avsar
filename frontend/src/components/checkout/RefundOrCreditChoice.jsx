/**
 * Refund vs Credit choice - the two options MUST be identical in size and
 * prominence. Both use `.avsar-pill` (identical dimensions). One is filled
 * black, the other filled cream. No pre-selection, no default.
 */
import { useState } from "react";

export default function RefundOrCreditChoice({ amount, onSubmit, disabled }) {
    const [selected, setSelected] = useState(null); // "refund" | "credit"
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            await onSubmit(selected);
        } finally {
            setBusy(false);
        }
    };

    const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

    return (
        <div className="avsar-card" data-testid="refund-or-credit">
            <div className="mb-6">
                <div className="text-xs uppercase tracking-widest opacity-60">
                    Make a selection
                </div>
                <div className="font-serif text-2xl mt-2">
                    How would you like to receive your {fmt(amount)}?
                </div>
                <div className="text-sm opacity-70 mt-1">
                    We never auto-convert your money. This is your call.
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <OptionCard
                    testid="option-refund"
                    active={selected === "refund"}
                    onSelect={() => setSelected("refund")}
                    title="Refund"
                    body="Refunded to your original payment method within 5–7 business days."
                />
                <OptionCard
                    testid="option-credit"
                    active={selected === "credit"}
                    onSelect={() => setSelected("credit")}
                    title="Priority pass"
                    body={`Get a ${fmt(amount)} credit that automatically applies to your next appointment at this business. Valid for 14 days.`}
                />
            </div>

            {/* IDENTICALLY SIZED pill buttons - same class, same min-width, same height. */}
            <div className="flex flex-col md:flex-row gap-4 mt-8">
                <button
                    data-testid="submit-refund"
                    onClick={() => {
                        setSelected("refund");
                    }}
                    className={`avsar-pill avsar-pill-fixed ${
                        selected === "refund"
                            ? "avsar-pill-primary"
                            : "avsar-pill-secondary"
                    }`}
                    disabled={disabled || busy}
                >
                    Pick refund
                </button>
                <button
                    data-testid="submit-credit"
                    onClick={() => {
                        setSelected("credit");
                    }}
                    className={`avsar-pill avsar-pill-fixed ${
                        selected === "credit"
                            ? "avsar-pill-primary"
                            : "avsar-pill-secondary"
                    }`}
                    disabled={disabled || busy}
                >
                    Pick priority pass
                </button>
            </div>

            <div className="mt-6 flex items-center gap-4">
                <button
                    data-testid="confirm-choice"
                    onClick={submit}
                    disabled={!selected || busy || disabled}
                    className="avsar-pill avsar-pill-primary"
                >
                    {busy ? "Working…" : selected ? `Confirm ${selected === "refund" ? "refund" : "priority pass"}` : "Confirm your choice"}
                </button>
                {selected && (
                    <span className="text-sm opacity-70" data-testid="choice-selected-hint">
                        You selected: <b>{selected === "refund" ? "Refund" : "Priority pass"}</b>
                    </span>
                )}
            </div>
        </div>
    );
}

function OptionCard({ testid, active, onSelect, title, body }) {
    return (
        <button
            data-testid={testid}
            onClick={onSelect}
            className={`text-left rounded-2xl p-6 transition-colors border ${
                active
                    ? "bg-[var(--avsar-cream)] border-[var(--avsar-ink)]"
                    : "bg-white border-[rgba(16,16,20,0.08)] hover:border-[rgba(16,16,20,0.25)]"
            }`}
        >
            <div className="font-serif text-2xl mb-2">{title}</div>
            <p className="text-sm opacity-80">{body}</p>
        </button>
    );
}
