/**
 * PriceBreakdown — displays EXACTLY what the backend returned. No math
 * client-side. The breakdown object comes from GET /checkout/:token.
 */
export default function PriceBreakdown({ breakdown }) {
    if (!breakdown) return null;
    const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
    const hasPass = Number(breakdown.priorityPassAmount) > 0;
    return (
        <div className="doctro-card" data-testid="price-breakdown">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-4">
                Price breakdown
            </div>
            <Row
                label="Standard consultation"
                value={fmt(breakdown.standardPrice)}
                testid="price-standard"
            />
            <Row
                label="Standby adjustment"
                value={`− ${fmt(breakdown.standbyAdjustment)}`}
                testid="price-adjustment"
                positive={false}
            />
            <Row
                label="Handling fee"
                value={`+ ${fmt(breakdown.handlingFee)}`}
                testid="price-handling"
                note="flat, not a percentage"
            />
            <div className="border-t border-[rgba(16,16,20,0.1)] my-3"></div>
            <Row
                label="Subtotal"
                value={fmt(breakdown.subtotal)}
                testid="price-subtotal"
                bold
            />
            {hasPass && (
                <Row
                    label="Priority pass credit"
                    value={`− ${fmt(breakdown.priorityPassAmount)}`}
                    testid="price-priority-pass"
                    note="from a clinic-cancelled booking"
                />
            )}
            <div className="border-t border-[rgba(16,16,20,0.1)] my-3"></div>
            <Row
                label="You pay today"
                value={fmt(breakdown.total)}
                testid="price-total"
                bold
                big
            />
        </div>
    );
}

function Row({ label, value, note, positive = true, bold = false, big = false, testid }) {
    return (
        <div className="flex justify-between items-baseline py-2">
            <div>
                <div className={bold ? "font-semibold" : "opacity-80"}>{label}</div>
                {note && <div className="text-[11px] opacity-60">{note}</div>}
            </div>
            <div
                data-testid={testid}
                className={`mono ${big ? "font-serif text-3xl" : bold ? "font-semibold" : ""} ${
                    positive ? "" : "opacity-90"
                }`}
            >
                {value}
            </div>
        </div>
    );
}
