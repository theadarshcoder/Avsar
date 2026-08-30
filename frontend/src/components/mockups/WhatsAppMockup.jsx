/**
 * WhatsApp message mockup. Body text matches the REAL backend template
 * EXACTLY - no price, no discount, no rupees, no percentages.
 */
export default function WhatsAppMockup() {
    return (
        <div
            data-testid="mockup-whatsapp"
            className="rounded-2xl bg-[#0B141A] p-5 w-full max-w-[420px] shadow-[0_12px_30px_rgba(16,16,20,0.15)]"
        >
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="w-9 h-9 rounded-full bg-[#25D366]/90 flex items-center justify-center text-white text-sm font-bold">
                    S
                </div>
                <div className="text-white">
                    <div className="text-sm font-semibold">Smile Service, Indiranagar</div>
                    <div className="text-[11px] opacity-60">online · via avsar</div>
                </div>
            </div>
            <div className="pt-5 pb-2">
                <div
                    className="wa-bubble"
                    data-testid="whatsapp-message-body"
                    style={{ color: "#0F1720" }}
                >
                    Update on your standby request: a slot opened at{" "}
                    <b>3:00 PM</b> today with <b>Dr. Anjali Menon</b>. Review your
                    priority status here:
                    <div className="text-[13px] mt-1 text-[#128C7E] underline break-all">
                        avsar.in/checkout/…
                    </div>
                </div>
                <div className="mt-2 text-[10px] text-white/50 pl-1">
                    delivered · 2 min ago
                </div>
            </div>
        </div>
    );
}
