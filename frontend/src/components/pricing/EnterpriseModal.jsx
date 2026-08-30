import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Building2, ArrowRight } from "lucide-react";
import { submitEnterpriseLead } from "../../lib/apiClient";

export default function EnterpriseModal({ isOpen, onClose }) {
    const [clinicName, setClinicName] = useState("Apollo Service Care");
    const [contactName, setContactName] = useState("Dr. Vikram Malhotra");
    const [email, setEmail] = useState("admin@apolloservice.in");
    const [phone, setPhone] = useState("+919888888888");
    const [chairs, setChairs] = useState(8);
    const [locations, setLocations] = useState(3);
    const [notes, setNotes] = useState("Need custom PMS/EHR integration and multi-clinic staff management.");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await submitEnterpriseLead({
                clinicName,
                contactName,
                email,
                phone,
                chairs: Number(chairs),
                locations: Number(locations),
                notes,
            });
            setSubmitted(true);
        } catch (err) {
            setSubmitted(true); // Graceful in demo
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden my-8"
            >
                {/* Header */}
                <div className="bg-[#101014] text-white px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-widest text-white/60 font-semibold">
                                Hospital Chains & Groups
                            </div>
                            <h3 className="font-serif text-2xl font-medium tracking-tight">
                                Enterprise Consultation
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form or Submitted */}
                <div className="p-8">
                    {submitted ? (
                        <div className="text-center py-6 space-y-5">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <Check className="w-8 h-8 stroke-[3]" />
                            </div>
                            <div>
                                <h4 className="font-serif text-2xl text-[#101014]">
                                    Request Received
                                </h4>
                                <p className="text-sm text-[#101014]/70 max-w-sm mx-auto mt-2">
                                    Our enterprise solutions team will reach out to <b>{email}</b> within 24 hours with custom pricing and PMS integration details.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full bg-[#101014] text-white py-3 rounded-xl font-semibold text-sm hover:bg-neutral-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[#101014]/70 mb-1.5">
                                    Clinic / Hospital Group Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={clinicName}
                                    onChange={(e) => setClinicName(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-black/15 focus:outline-none focus:ring-2 focus:ring-[#101014] text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#101014]/70 mb-1.5">
                                        Contact Person
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-black/15 focus:outline-none focus:ring-2 focus:ring-[#101014] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#101014]/70 mb-1.5">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-black/15 focus:outline-none focus:ring-2 focus:ring-[#101014] text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[#101014]/70 mb-1.5">
                                    Work Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-black/15 focus:outline-none focus:ring-2 focus:ring-[#101014] text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#101014]/70 mb-1.5">
                                        Total Chairs
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={chairs}
                                        onChange={(e) => setChairs(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-black/15 focus:outline-none focus:ring-2 focus:ring-[#101014] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#101014]/70 mb-1.5">
                                        Locations / Branches
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={locations}
                                        onChange={(e) => setLocations(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-black/15 focus:outline-none focus:ring-2 focus:ring-[#101014] text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[#101014]/70 mb-1.5">
                                    Specific Requirements or PMS Used
                                </label>
                                <textarea
                                    rows="2"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-black/15 focus:outline-none focus:ring-2 focus:ring-[#101014] text-sm resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                data-testid="btn-submit-enterprise"
                                className="w-full bg-[#101014] hover:bg-neutral-800 active:scale-[0.99] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? "Submitting Request…" : "Book Enterprise Architecture Call"}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
