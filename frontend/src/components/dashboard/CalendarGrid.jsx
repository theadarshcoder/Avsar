import SlotStatusBadge from "./SlotStatusBadge";

function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Grid of today's slots. Renders a card per slot with action buttons that
 * change based on status. Business logic (what statuses allow what) lives
 * in the parent's action handlers.
 */
export default function CalendarGrid({ slots, onOpenSlot, onCancelBooked, busySlotId }) {
    if (!slots || slots.length === 0) {
        return (
            <div className="doctro-card" data-testid="calendar-empty">
                No slots yet. Seed the demo data or add one.
            </div>
        );
    }

    return (
        <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="calendar-grid"
        >
            {slots.map((s) => {
                const busy = busySlotId === s.id;
                return (
                    <div
                        key={s.id}
                        data-testid={`slot-card-${s.id}`}
                        className="doctro-card flex flex-col gap-3"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="mono text-2xl font-serif">
                                    {formatTime(s.startTime)}
                                </div>
                                <div className="text-sm opacity-70">{s.doctorName}</div>
                            </div>
                            <SlotStatusBadge status={s.status} />
                        </div>

                        <div className="text-xs opacity-60 mono">
                            slot id: {s.id}
                        </div>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {s.status === "scheduled" && (
                                <button
                                    data-testid={`btn-cancel-scheduled-${s.id}`}
                                    disabled={busy}
                                    onClick={() => onOpenSlot(s)}
                                    className="doctro-pill doctro-pill-primary"
                                    style={{ height: 40, minWidth: 0, padding: "0 16px", fontSize: 13 }}
                                >
                                    {busy ? "Broadcasting…" : "Cancel & broadcast"}
                                </button>
                            )}
                            {s.status === "open" && (
                                <span
                                    className="text-xs opacity-70"
                                    data-testid={`open-hint-${s.id}`}
                                >
                                    Waiting for a standby patient to pay
                                </span>
                            )}
                            {s.status === "booked" && (
                                <button
                                    data-testid={`btn-cancel-booked-${s.id}`}
                                    disabled={busy}
                                    onClick={() => onCancelBooked(s)}
                                    className="doctro-pill doctro-pill-secondary"
                                    style={{ height: 40, minWidth: 0, padding: "0 16px", fontSize: 13 }}
                                >
                                    Cancel booking
                                </button>
                            )}
                            {s.status === "cancelled_by_clinic" && (
                                <span className="text-xs opacity-70">
                                    Cancelled — patient offered refund or credit
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
