import { useEffect, useState } from "react";
import { getClinicStatsToday } from "../../lib/apiClient";

export default function RevenueTicker({ clinicId, refreshKey }) {
    const [stats, setStats] = useState({ todayRevenue: 0, bookedCount: 0 });

    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const s = await getClinicStatsToday(clinicId);
                if (alive) setStats(s);
            } catch {
                /* ignore */
            }
        };
        load();
        const t = setInterval(load, 5000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, [clinicId, refreshKey]);

    return (
        <div className="avsar-card" data-testid="revenue-ticker">
            <div className="text-xs uppercase tracking-widest opacity-60">
                Standby revenue recovered today
            </div>
            <div className="font-serif text-5xl mono mt-2" data-testid="revenue-today-amount">
                ₹{Number(stats.todayRevenue || 0).toLocaleString("en-IN")}
            </div>
            <div className="text-sm opacity-70 mt-1">
                {stats.bookedCount} standby booking{stats.bookedCount === 1 ? "" : "s"} today
            </div>
        </div>
    );
}
