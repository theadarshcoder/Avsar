import { useEffect, useState } from "react";
import { listWaitlist } from "../../lib/apiClient";
import AddPatientForm from "./AddPatientForm";
import WaitlistRow from "./WaitlistRow";

/**
 * Waitlist management panel for the clinic dashboard.
 * - Lists entries with clear "consented" vs "no consent" states.
 * - Add-patient form with explicit consent capture.
 * - Per-row actions: record consent, remove.
 */
export default function WaitlistPanel({ clinicId, clinicName }) {
    const [entries, setEntries] = useState(null);
    const [error, setError] = useState(null);

    const load = async () => {
        try {
            const data = await listWaitlist(clinicId);
            setEntries(data);
        } catch (e) {
            setError(e?.response?.data?.detail || String(e));
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clinicId]);

    const consentedCount = (entries || []).filter((e) => e.consentGivenAt).length;
    const nonConsentedCount = (entries || []).filter((e) => !e.consentGivenAt).length;

    return (
        <section
            className="doctro-section section-bg-lavender"
            data-testid="waitlist-panel"
        >
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <div>
                        <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                            Waitlist
                        </div>
                        <h2 className="font-serif text-3xl sm:text-4xl mt-2">
                            Who gets notified when a slot opens up
                        </h2>
                    </div>
                    <div
                        className="flex gap-3 text-sm"
                        data-testid="waitlist-counts"
                    >
                        <Chip
                            label={`${consentedCount} consented`}
                            className="status-booked"
                            testid="waitlist-count-consented"
                        />
                        <Chip
                            label={`${nonConsentedCount} without consent`}
                            className="status-cancelled"
                            testid="waitlist-count-non-consented"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1">
                        <AddPatientForm
                            clinicId={clinicId}
                            clinicName={clinicName}
                            onAdded={() => load()}
                        />
                    </div>
                    <div className="lg:col-span-2 space-y-4" data-testid="waitlist-list">
                        {error && (
                            <div
                                className="doctro-card"
                                style={{ background: "#FFE4E4" }}
                            >
                                {String(error)}
                            </div>
                        )}
                        {entries?.length === 0 && (
                            <div className="doctro-card" data-testid="waitlist-empty">
                                No patients on the waitlist yet. Add one on the left.
                            </div>
                        )}
                        {(entries || []).map((e) => (
                            <WaitlistRow
                                key={e.id}
                                entry={e}
                                clinicName={clinicName}
                                onChanged={load}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function Chip({ label, className, testid }) {
    return (
        <span
            data-testid={testid}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}
        >
            {label}
        </span>
    );
}
