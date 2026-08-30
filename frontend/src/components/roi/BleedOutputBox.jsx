/**
 * ROI output. Renders whatever the parent computed. Also prints the
 * exact required footnote verbatim.
 */
export default function BleedOutputBox({ monthlyBleed, recoverable }) {
    const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
    return (
        <div data-testid="roi-output" className="avsar-card mt-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="text-xs uppercase tracking-widest opacity-60">
                        You are losing (monthly)
                    </div>
                    <div
                        data-testid="roi-monthly-bleed"
                        className="font-serif text-5xl md:text-6xl mt-2 mono"
                    >
                        {fmt(monthlyBleed)}
                    </div>
                    <div className="text-sm opacity-70 mt-2">
                        weekly cancellations × hourly rate × 4 weeks
                    </div>
                </div>
                <div className="md:border-l md:pl-6 md:border-[rgba(16,16,20,0.08)]">
                    <div className="text-xs uppercase tracking-widest opacity-60">
                        avsar can help you recover
                    </div>
                    <div
                        data-testid="roi-recoverable"
                        className="font-serif text-5xl md:text-6xl mt-2 mono"
                    >
                        {fmt(recoverable)}
                    </div>
                    <div className="text-sm opacity-70 mt-2">
                        modeled at an 80% take-rate
                    </div>
                </div>
            </div>
            <p
                data-testid="roi-footnote"
                className="text-xs opacity-70 mt-8 italic max-w-2xl"
            >
                Recovery estimate modeled at an 80% take-rate, a conservative assumption,
                not a measured benchmark.
            </p>
        </div>
    );
}
