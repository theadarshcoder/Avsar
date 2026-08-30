import { useState } from "react";
import { consentTextFor } from "../../lib/consent";
import { recordConsent, removeWaitlistEntry } from "../../lib/apiClient";

function formatWhen(iso) {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

/**
 * One waitlist row. Two actions:
 *  - Record consent (only if not yet consented). Shows the exact text
 *    and posts to the server; timestamp is set server-side.
 *  - Remove (two-step confirm).
 */
export default function WaitlistRow({ entry, clinicName, onChanged }) {
    const [showConsent, setShowConsent] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [error, setError] = useState(null);

    const consentText = consentTextFor(clinicName || "this business");
    const consented = Boolean(entry.consentGivenAt);

    const submitConsent = async () => {
        setBusy(true);
        setError(null);
        try {
            await recordConsent(entry.id);
            setShowConsent(false);
            setConfirming(false);
            onChanged?.();
        } catch (e) {
            setError(e?.response?.data?.detail || String(e));
        } finally {
            setBusy(false);
        }
    };

    const doRemove = async () => {
        setBusy(true);
        setError(null);
        try {
            await removeWaitlistEntry(entry.id);
            onChanged?.();
        } catch (e) {
            setError(e?.response?.data?.detail || String(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="avsar-card"
            data-testid={`waitlist-row-${entry.id}`}
        >
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="font-semibold" data-testid={`row-name-${entry.id}`}>
                        {entry.patientName || "(unknown)"}
                    </div>
                    <div className="text-xs mono opacity-70">{entry.phone}</div>
                    <div className="text-[11px] opacity-60 mt-1">
                        Prefers: {entry.notificationPreference || "whatsapp"}
                    </div>
                </div>
                {consented ? (
                    <span
                        className="text-[10px] font-semibold px-2 py-1 rounded-full status-booked"
                        data-testid={`row-consent-status-${entry.id}`}
                    >
                        CONSENTED · {formatWhen(entry.consentGivenAt)}
                    </span>
                ) : (
                    <span
                        className="text-[10px] font-semibold px-2 py-1 rounded-full status-cancelled"
                        data-testid={`row-consent-status-${entry.id}`}
                    >
                        NO CONSENT · WILL NEVER BE NOTIFIED
                    </span>
                )}
            </div>

            {consented && entry.consentText && (
                <div
                    className="text-[11px] opacity-70 mt-3 italic"
                    data-testid={`row-consent-text-${entry.id}`}
                >
                    "{entry.consentText}"
                </div>
            )}

            {entry.lastNotificationError && (
                <div
                    className="text-xs mt-3 rounded-lg p-2"
                    style={{ background: "#FFE4E4", color: "#5A0E0E" }}
                    data-testid={`row-last-error-${entry.id}`}
                >
                    Last send error: {entry.lastNotificationError}
                </div>
            )}

            {error && (
                <div
                    className="text-xs mt-3 rounded-lg p-2"
                    style={{ background: "#FFE4E4", color: "#5A0E0E" }}
                >
                    {String(error)}
                </div>
            )}

            {/* Consent capture inline */}
            {showConsent && !consented && (
                <div
                    className="mt-4 rounded-2xl p-4 border border-[rgba(16,16,20,0.1)]"
                    style={{ background: "var(--avsar-cream)" }}
                    data-testid={`consent-panel-${entry.id}`}
                >
                    <div className="text-sm font-semibold">Record explicit consent</div>
                    <div
                        className="text-sm opacity-85 mt-1"
                        data-testid={`consent-panel-text-${entry.id}`}
                    >
                        {consentText}
                    </div>
                    <label className="flex items-start gap-2 mt-3">
                        <input
                            type="checkbox"
                            data-testid={`consent-panel-check-${entry.id}`}
                            checked={confirming}
                            onChange={(e) => setConfirming(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-[var(--avsar-ink)]"
                        />
                        <span className="text-xs">
                            The customer just confirmed the statement above to me.
                        </span>
                    </label>
                    <div className="flex gap-2 mt-4">
                        <button
                            data-testid={`btn-consent-confirm-${entry.id}`}
                            disabled={!confirming || busy}
                            onClick={submitConsent}
                            className="avsar-pill avsar-pill-primary"
                            style={{ height: 40, minWidth: 0, padding: "0 20px", fontSize: 13 }}
                        >
                            {busy ? "Saving…" : "Save consent"}
                        </button>
                        <button
                            data-testid={`btn-consent-cancel-${entry.id}`}
                            disabled={busy}
                            onClick={() => {
                                setShowConsent(false);
                                setConfirming(false);
                            }}
                            className="avsar-pill avsar-pill-secondary"
                            style={{ height: 40, minWidth: 0, padding: "0 20px", fontSize: 13 }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-4 flex-wrap">
                {!consented && !showConsent && (
                    <button
                        data-testid={`btn-record-consent-${entry.id}`}
                        onClick={() => setShowConsent(true)}
                        className="avsar-pill avsar-pill-primary"
                        style={{ height: 40, minWidth: 0, padding: "0 20px", fontSize: 13 }}
                    >
                        Record consent
                    </button>
                )}
                {!confirmRemove ? (
                    <button
                        data-testid={`btn-remove-${entry.id}`}
                        onClick={() => setConfirmRemove(true)}
                        className="avsar-pill avsar-pill-secondary"
                        style={{ height: 40, minWidth: 0, padding: "0 20px", fontSize: 13 }}
                    >
                        Remove
                    </button>
                ) : (
                    <>
                        <button
                            data-testid={`btn-remove-confirm-${entry.id}`}
                            disabled={busy}
                            onClick={doRemove}
                            className="avsar-pill avsar-pill-primary"
                            style={{
                                height: 40, minWidth: 0, padding: "0 20px", fontSize: 13,
                                background: "#5A0E0E",
                            }}
                        >
                            {busy ? "Removing…" : "Yes, remove"}
                        </button>
                        <button
                            data-testid={`btn-remove-cancel-${entry.id}`}
                            disabled={busy}
                            onClick={() => setConfirmRemove(false)}
                            className="avsar-pill avsar-pill-secondary"
                            style={{ height: 40, minWidth: 0, padding: "0 20px", fontSize: 13 }}
                        >
                            Cancel
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
