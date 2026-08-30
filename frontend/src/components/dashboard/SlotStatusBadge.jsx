const LABEL = {
    scheduled: "Scheduled",
    open: "Open · Broadcast sent",
    locked: "Locked",
    booked: "Booked",
    cancelled_by_clinic: "Cancelled",
};

const CLASS = {
    scheduled: "status-scheduled",
    open: "status-open",
    locked: "status-locked",
    booked: "status-booked",
    cancelled_by_clinic: "status-cancelled",
};

export default function SlotStatusBadge({ status }) {
    const key = status || "scheduled";
    return (
        <span
            data-testid={`slot-status-${key}`}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${CLASS[key] || "status-scheduled"}`}
        >
            {LABEL[key] || key}
        </span>
    );
}
