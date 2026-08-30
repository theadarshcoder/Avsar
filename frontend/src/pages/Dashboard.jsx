import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import CalendarGrid from "../components/dashboard/CalendarGrid";
import RevenueTicker from "../components/dashboard/RevenueTicker";
import WaitlistPanel from "../components/waitlist/WaitlistPanel";
import { useSlotStatus } from "../hooks/useSlotStatus";
import {
    getClinic,
    openSlotAndBroadcast,
    cancelBookedSlot,
    getSlotOutbox,
} from "../lib/apiClient";

export default function Dashboard() {
    const { clinicId } = useParams();
    const [clinic, setClinic] = useState(null);
    const [busySlotId, setBusySlotId] = useState(null);
    const [outbox, setOutbox] = useState(null); // { slotId, entries: [...] }
    const [cancellation, setCancellation] = useState(null); // { slotId, transactionId }
    const [refreshKey, setRefreshKey] = useState(0);
    const [error, setError] = useState(null);

    const { slots, refresh } = useSlotStatus(clinicId, { intervalMs: 4000 });

    useEffect(() => {
        getClinic(clinicId)
            .then(setClinic)
            .catch((e) => setError(e?.response?.data?.detail || String(e)));
    }, [clinicId]);

    const onOpenSlot = async (slot) => {
        setBusySlotId(slot.id);
        setError(null);
        try {
            const result = await openSlotAndBroadcast(slot.id);
            setOutbox({
                slotId: slot.id,
                doctorName: slot.doctorName,
                startTime: slot.startTime,
                broadcast: result,
                entries: result.outbox || [],
            });
            setRefreshKey((k) => k + 1);
            refresh();
        } catch (e) {
            setError(e?.response?.data?.detail || String(e));
        } finally {
            setBusySlotId(null);
        }
    };

    const onCancelBooked = async (slot) => {
        setBusySlotId(slot.id);
        setError(null);
        try {
            const result = await cancelBookedSlot(slot.id);
            setCancellation({
                slotId: slot.id,
                doctorName: slot.doctorName,
                transactionId: result?.transaction?.id,
                message: result?.message,
            });
            setRefreshKey((k) => k + 1);
            refresh();
        } catch (e) {
            setError(e?.response?.data?.detail || String(e));
        } finally {
            setBusySlotId(null);
        }
    };

    const reloadOutboxForSlot = async (slotId) => {
        try {
            const data = await getSlotOutbox(slotId);
            setOutbox((o) => ({ ...(o || {}), slotId, entries: data.outbox || [] }));
        } catch (e) {
            /* ignore */
        }
    };

    return (
        <div>
            <section
                className="avsar-section section-bg-yellow"
                data-testid="dashboard-header"
                style={{ marginTop: 12 }}
            >
                <div className="max-w-6xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                        Clinic dashboard · phase-1 demo
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-4 mt-2 mb-3">
                        <h1 className="font-serif text-4xl sm:text-5xl">
                            {clinic?.name || "…"}
                        </h1>
                        <button
                            onClick={() => {
                                localStorage.removeItem("avsar_clinic_token");
                                localStorage.removeItem("avsar_clinic");
                                window.location.href = "/login";
                            }}
                            className="text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-black bg-black/[0.04] hover:bg-black/[0.08] px-3.5 py-1.5 rounded-full transition-all"
                        >
                            Sign out
                        </button>
                    </div>
                    <p className="opacity-80 max-w-xl">
                        Authenticated clinic session. Open or cancel a scheduled slot to trigger waitlist notifications and view live standby revenue.
                    </p>
                    <div className="mt-6 max-w-md">
                        <RevenueTicker clinicId={clinicId} refreshKey={refreshKey} />
                    </div>
                </div>
            </section>

            {error && (
                <div
                    className="avsar-section"
                    style={{ background: "#FFE4E4", padding: "24px 48px", margin: "12px 24px" }}
                    data-testid="dashboard-error"
                >
                    <b>Something went wrong.</b> {String(error)}
                </div>
            )}

            <section className="avsar-section" style={{ background: "#FFFFFF" }}>
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-serif text-3xl">Today's slots</h2>
                        <button
                            data-testid="btn-refresh-slots"
                            onClick={() => refresh()}
                            className="avsar-pill avsar-pill-secondary"
                            style={{ height: 40, minWidth: 0, padding: "0 20px", fontSize: 13 }}
                        >
                            Refresh
                        </button>
                    </div>
                    <CalendarGrid
                        slots={slots}
                        onOpenSlot={onOpenSlot}
                        onCancelBooked={onCancelBooked}
                        busySlotId={busySlotId}
                    />
                </div>
            </section>

            <WaitlistPanel clinicId={clinicId} clinicName={clinic?.name} />

            {outbox && (
                <section
                    className="avsar-section section-bg-teal"
                    data-testid="outbox-section"
                >
                    <div className="max-w-6xl mx-auto">
                        <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                            Mock WhatsApp outbox
                        </div>
                        <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-3">
                            Broadcast fired for {outbox.doctorName} at{" "}
                            {new Date(outbox.startTime).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </h2>
                        <p className="opacity-80 max-w-2xl mb-6">
                            In production, these WhatsApp messages ship via the Business API.
                            <b> In this Phase-1 build, no message actually reached a phone.</b>{" "}
                            Click any of the links below to open the checkout page as that
                            patient.
                        </p>

                        <div className="avsar-card mb-6" data-testid="broadcast-summary">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Stat label="Consented" value={outbox.broadcast.consentedPatients} testid="stat-consented" />
                                <Stat label="Skipped (no consent)" value={outbox.broadcast.skippedNonConsented} testid="stat-skipped" />
                                <Stat label="Sent" value={outbox.broadcast.sent} testid="stat-sent" />
                                <Stat label="Failed" value={outbox.broadcast.failed} testid="stat-failed" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {outbox.entries.map((e) => (
                                <div
                                    key={e.patientId}
                                    data-testid={`outbox-entry-${e.patientId}`}
                                    className="avsar-card flex flex-col gap-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold">{e.patientName}</div>
                                            <div className="text-xs opacity-70 mono">{e.phone}</div>
                                        </div>
                                        <span
                                            className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                                                e.status === "sent"
                                                    ? "status-booked"
                                                    : "status-cancelled"
                                            }`}
                                        >
                                            {e.status === "sent" ? "DELIVERED (mock)" : "FAILED"}
                                        </span>
                                    </div>
                                    {e.status === "failed" && (
                                        <div className="text-xs opacity-70">
                                            {e.error}. The broadcast continued for everyone else.
                                        </div>
                                    )}
                                    {e.token && (
                                        <Link
                                            data-testid={`outbox-open-${e.patientId}`}
                                            to={`/checkout/${e.token}`}
                                            className="avsar-pill avsar-pill-primary"
                                            style={{ height: 40, minWidth: 0, padding: "0 20px", fontSize: 13 }}
                                        >
                                            Open checkout as this patient
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                className="avsar-pill avsar-pill-secondary"
                                onClick={() => reloadOutboxForSlot(outbox.slotId)}
                                style={{ height: 40, minWidth: 0, padding: "0 20px", fontSize: 13 }}
                                data-testid="btn-reload-outbox"
                            >
                                Reload outbox
                            </button>
                            <button
                                className="avsar-pill avsar-pill-secondary"
                                onClick={() => setOutbox(null)}
                                style={{ height: 40, minWidth: 0, padding: "0 20px", fontSize: 13 }}
                                data-testid="btn-close-outbox"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {cancellation?.transactionId && (
                <section className="avsar-section section-bg-peach" data-testid="cancellation-section">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                            Booked slot cancelled
                        </div>
                        <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-3">
                            Offer the patient a refund <em>or</em> a priority pass.
                        </h2>
                        <p className="opacity-80 max-w-2xl mb-4">{cancellation.message}</p>
                        <Link
                            data-testid="link-open-choice-page"
                            to={`/choice/${cancellation.transactionId}`}
                            className="avsar-pill avsar-pill-primary"
                        >
                            Open patient's choice page
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
}

function Stat({ label, value, testid }) {
    return (
        <div>
            <div className="text-xs uppercase tracking-widest opacity-60">{label}</div>
            <div
                data-testid={testid}
                className="font-serif text-3xl mono mt-1"
            >
                {value}
            </div>
        </div>
    );
}
