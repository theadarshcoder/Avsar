import { useEffect, useRef, useState } from "react";
import { listSlots } from "../lib/apiClient";

/**
 * Polls the clinic's slots on an interval.
 * Returns { slots, refresh, error }.
 */
export function useSlotStatus(clinicId, { intervalMs = 5000 } = {}) {
    const [slots, setSlots] = useState([]);
    const [error, setError] = useState(null);
    const timerRef = useRef(null);
    const alive = useRef(true);

    const refresh = async () => {
        try {
            const data = await listSlots(clinicId);
            if (alive.current) setSlots(data);
        } catch (e) {
            if (alive.current) setError(e);
        }
    };

    useEffect(() => {
        alive.current = true;
        refresh();
        timerRef.current = setInterval(refresh, intervalMs);
        return () => {
            alive.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clinicId, intervalMs]);

    return { slots, refresh, error };
}
