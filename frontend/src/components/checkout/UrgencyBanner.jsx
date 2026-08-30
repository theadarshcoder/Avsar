/**
 * Truthful urgency banner - no fake countdown timers. If the slot's
 * startTime is in the future we show how long until it starts. Otherwise
 * we tell the user the slot is expired.
 */
import { useEffect, useState } from "react";

function fmtCountdown(ms) {
    if (ms <= 0) return "starting now";
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `in ${h}h ${m}m`;
    if (m > 0) return `in ${m}m`;
    return "in less than a minute";
}

export default function UrgencyBanner({ startTime, providerName }) {
    const start = new Date(startTime).getTime();
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(t);
    }, []);
    const timeLabel = new Date(startTime).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
    const diff = start - now;
    const isPast = diff <= 0;

    return (
        <div
            data-testid="urgency-banner"
            className="avsar-card"
            style={{ background: "#FFF6E5", borderColor: "rgba(103,74,0,0.15)" }}
        >
            <div className="flex items-start gap-4 flex-wrap">
                <div>
                    <div className="text-xs uppercase tracking-widest opacity-70">
                        Standby appointment
                    </div>
                    <div className="font-serif text-3xl mt-1">
                        {timeLabel} · <span className="opacity-80">{providerName}</span>
                    </div>
                </div>
                <div className="ml-auto text-right">
                    <div className="text-xs uppercase tracking-widest opacity-70">
                        Starts
                    </div>
                    <div
                        className="mono text-lg font-semibold"
                        data-testid="urgency-countdown"
                    >
                        {isPast ? "already passed" : fmtCountdown(diff)}
                    </div>
                </div>
            </div>
            <p className="text-sm opacity-80 mt-4" data-testid="urgency-copy">
                This slot is offered to multiple standby customers. The first confirmed
                payment wins. If you aren't the one, your payment is automatically
                refunded.
            </p>
        </div>
    );
}
