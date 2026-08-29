/**
 * Checkout page mockup — this IS the only place a price is shown, both in
 * the real product and in this marketing screenshot. That's the whole point.
 */
export default function CheckoutMockup() {
    const Row = ({ label, value, note, bold = false, big = false }) => (
        <div className="flex justify-between items-baseline py-1.5">
            <div>
                <div className={bold ? "font-semibold text-sm" : "text-sm opacity-80"}>
                    {label}
                </div>
                {note && <div className="text-[10px] opacity-60">{note}</div>}
            </div>
            <div className={`mono ${big ? "font-serif text-2xl" : bold ? "font-semibold text-sm" : "text-sm"}`}>
                {value}
            </div>
        </div>
    );
    return (
        <div
            data-testid="mockup-checkout"
            className="rounded-2xl bg-white p-5 w-full max-w-[420px] shadow-[0_12px_30px_rgba(16,16,20,0.10)] border border-[rgba(16,16,20,0.06)]"
        >
            <div className="rounded-xl p-3 mb-4" style={{ background: "#FFF6E5" }}>
                <div className="text-[10px] uppercase tracking-widest opacity-70">
                    Standby appointment
                </div>
                <div className="font-serif text-lg mt-0.5">3:00 PM · Dr. Anjali Menon</div>
            </div>
            <Row label="Standard consultation" value="₹1,800" />
            <Row label="Standby adjustment" value="− ₹400" />
            <Row label="Handling fee" value="+ ₹50" note="flat, not a percentage" />
            <div className="border-t border-[rgba(16,16,20,0.1)] my-2"></div>
            <Row label="You pay today" value="₹1,450" bold big />
            <div className="mt-4">
                <div className="doctro-pill doctro-pill-primary w-full" style={{ minWidth: 0 }}>
                    Confirm & pay
                </div>
            </div>
        </div>
    );
}
