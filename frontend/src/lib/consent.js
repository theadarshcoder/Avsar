/**
 * Builds the exact consent copy shown next to the checkbox / recorded to
 * the backend. Keeping it in one place guarantees the text stored equals
 * the text shown at the moment of consent.
 */
export function consentTextFor(clinicName) {
    return `I agree to receive WhatsApp notifications about last-minute appointment openings at ${clinicName}. No prices will be included in messages.`;
}
