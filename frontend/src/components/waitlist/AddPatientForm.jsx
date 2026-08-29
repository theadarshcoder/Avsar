import { useState } from "react";
import { consentTextFor } from "../../lib/consent";
import { addToWaitlist } from "../../lib/apiClient";

/**
 * Add-patient form.
 *  - Consent checkbox is UNCHECKED BY DEFAULT.
 *  - The consent text shown is the exact text stored server-side.
 *  - Submitting with checkbox unchecked STILL adds them, but with
 *    consentGivenAt=null. The row will render honestly as
 *    "No consent — will never be notified."
 */
export default function AddPatientForm({ clinicId, clinicName, onAdded }) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const consentText = consentTextFor(clinicName || "this clinic");

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            const body = {
                name,
                phone,
                notificationPreference: "whatsapp",
                consentGiven: consent,
                consentText: consent ? consentText : null,
            };
            const result = await addToWaitlist(clinicId, body);
            onAdded?.(result);
            setName("");
            setPhone("");
            setConsent(false);
        } catch (e) {
            setError(e?.response?.data?.detail || String(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form
            data-testid="add-patient-form"
            onSubmit={submit}
            className="doctro-card space-y-4"
        >
            <div>
                <div className="text-xs uppercase tracking-widest opacity-60">
                    Add to waitlist
                </div>
                <div className="font-serif text-2xl mt-1">New patient</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                    label="Name"
                    testid="input-name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Priya Menon"
                    required
                />
                <Field
                    label="Phone"
                    testid="input-phone"
                    value={phone}
                    onChange={setPhone}
                    placeholder="+91…"
                    required
                    mono
                />
            </div>

            <label
                data-testid="consent-block"
                className="flex items-start gap-3 rounded-2xl p-4 border border-[rgba(16,16,20,0.1)] cursor-pointer select-none"
                style={{ background: "var(--doctro-cream)" }}
            >
                <input
                    type="checkbox"
                    data-testid="consent-checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-[var(--doctro-ink)]"
                />
                <div>
                    <div className="text-sm font-semibold">Explicit consent</div>
                    <div
                        className="text-sm opacity-85 mt-1"
                        data-testid="consent-text"
                    >
                        {consentText}
                    </div>
                    <div className="text-[11px] opacity-60 mt-2">
                        Leave this unchecked to add the patient without consent — they
                        will <b>not</b> receive any standby notifications until they
                        opt in.
                    </div>
                </div>
            </label>

            {error && (
                <div
                    className="text-sm rounded-xl p-3"
                    style={{ background: "#FFE4E4", color: "#5A0E0E" }}
                    data-testid="add-patient-error"
                >
                    {String(error)}
                </div>
            )}

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={busy || !name.trim() || !phone.trim()}
                    data-testid="btn-submit-patient"
                    className="doctro-pill doctro-pill-primary"
                >
                    {busy ? "Adding…" : consent ? "Add with consent" : "Add without consent"}
                </button>
                <span className="text-xs opacity-70" data-testid="consent-status-hint">
                    Consent is {consent ? "ON" : "OFF"} — timestamp comes from the server.
                </span>
            </div>
        </form>
    );
}

function Field({ label, value, onChange, placeholder, testid, required, mono }) {
    return (
        <label className="block">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-1">
                {label}
            </div>
            <input
                type="text"
                required={required}
                value={value}
                data-testid={testid}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full rounded-xl border border-[rgba(16,16,20,0.15)] px-4 py-3 outline-none focus:border-[var(--doctro-ink)] ${
                    mono ? "mono" : ""
                }`}
            />
        </label>
    );
}
