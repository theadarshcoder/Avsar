/**
 * Vacancy flagging mockup - clean product-UI card showing an empty slot
 * being flagged. Pure CSS/SVG, no external image asset needed.
 */
export default function VacancyMockup() {
    return (
        <div
            data-testid="mockup-vacancy"
            className="rounded-2xl bg-white p-5 shadow-[0_12px_30px_rgba(16,16,20,0.08)] border border-[rgba(16,16,20,0.06)] w-full max-w-[420px]"
        >
            <div className="flex items-center justify-between text-xs opacity-60 mb-4">
                <span>Today · 12 Feb</span>
                <span className="mono">Smile Service</span>
            </div>
            {[
                { t: "10:00 AM", d: "Dr. Anjali", state: "booked" },
                { t: "11:00 AM", d: "Dr. Rohan", state: "vacant" },
                { t: "12:00 PM", d: "Dr. Anjali", state: "booked" },
                { t: "01:30 PM", d: "Dr. Rohan", state: "booked" },
            ].map((row) => (
                <div
                    key={row.t}
                    className={`flex items-center justify-between py-3 border-b last:border-b-0 border-[rgba(16,16,20,0.06)] ${
                        row.state === "vacant" ? "bg-[#FFF6E5] -mx-3 px-3 rounded-lg" : ""
                    }`}
                >
                    <div>
                        <div className="mono text-sm font-semibold">{row.t}</div>
                        <div className="text-xs opacity-70">{row.d}</div>
                    </div>
                    {row.state === "booked" ? (
                        <span className="status-booked text-[10px] font-semibold px-2 py-1 rounded-full">
                            BOOKED
                        </span>
                    ) : (
                        <span className="status-open text-[10px] font-semibold px-2 py-1 rounded-full">
                            VACANT · FLAG
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
