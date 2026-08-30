import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Building2, MessageSquare } from "lucide-react";
import Nav from "../components/Nav";
import { getTransaction } from "../lib/apiClient";

export default function Confirmation() {
    const { bookingId } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        getTransaction(bookingId)
            .then(setData)
            .catch((e) => setError(e?.response?.data?.detail || String(e)));
    }, [bookingId]);

    return (
        <div className="min-h-screen lg:h-screen lg:max-h-screen flex flex-col bg-[#FCFBF8] lg:overflow-hidden">
            <Nav />
            <main
                className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-4"
                data-testid="confirmation-page"
            >
                <div className="w-full max-w-xl my-auto">
                    {/* Header */}
                    <div className="text-center mb-5">
                        <div className="text-[11px] uppercase tracking-[0.25em] text-[#101014]/60 font-semibold mb-1">
                            Booking Confirmed
                        </div>
                        <h1 className="font-serif text-3xl sm:text-4xl text-[#101014] tracking-tight">
                            You got the slot.
                        </h1>
                        <p className="text-xs sm:text-sm opacity-75 mt-1.5 max-w-md mx-auto">
                            Your payment has been received and your appointment is locked with the clinic.
                        </p>
                    </div>

                    {error && (
                        <div
                            className="avsar-card text-center p-4 mb-4"
                            data-testid="confirmation-error"
                            style={{ background: "#FFE4E4", color: "#5A0E0E" }}
                        >
                            <p className="font-semibold text-sm">{String(error)}</p>
                        </div>
                    )}

                    {data && (
                        <div
                            className="avsar-card bg-white border border-[var(--avsar-line)] shadow-sm rounded-3xl p-5 sm:p-6 space-y-4"
                            data-testid="confirmation-card"
                        >
                            {/* Appointment Details Section */}
                            <div className="space-y-3">
                                <div className="flex items-start justify-between border-b border-[var(--avsar-line)] pb-3.5">
                                    <div>
                                        <span className="text-[10px] uppercase tracking-widest opacity-60 font-semibold block">
                                            Confirmed Appointment
                                        </span>
                                        <div
                                            className="font-serif text-2xl sm:text-2xl text-[#101014] mt-0.5"
                                            data-testid="confirmation-appt"
                                        >
                                            {new Date(data.slot.startTime).toLocaleTimeString([], {
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}{" "}
                                            · {data.slot.providerName}
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        Confirmed
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-0.5">
                                    <div className="flex items-center gap-2 text-[#101014]/80">
                                        <Building2 className="w-3.5 h-3.5 opacity-50 shrink-0" />
                                        <span className="truncate">{data.clinic?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#101014]/80">
                                        <Calendar className="w-3.5 h-3.5 opacity-50 shrink-0" />
                                        <span>
                                            {new Date(data.slot.startTime).toLocaleDateString("en-IN", {
                                                weekday: "short",
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Summary Box */}
                            <div className="p-4 rounded-2xl bg-[var(--avsar-cream)] border border-[rgba(16,16,20,0.06)] space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest opacity-60 font-semibold">
                                            Amount Paid
                                        </div>
                                        <div
                                            className="font-serif text-2xl mono text-[#101014] font-bold mt-0.5"
                                            data-testid="confirmation-amount"
                                        >
                                            ₹{Number(data.transaction.totalPaid).toLocaleString("en-IN")}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] uppercase tracking-widest opacity-60 font-semibold">
                                            Status
                                        </div>
                                        <div className="text-xs font-semibold text-emerald-800 mt-0.5">
                                            Paid & Locked
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-[rgba(16,16,20,0.08)] pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                    <span className="opacity-60">Transaction Reference:</span>
                                    <span className="mono font-semibold opacity-90 break-all">
                                        {data.transaction.id}
                                    </span>
                                </div>
                            </div>

                            {/* WhatsApp Notification Notice */}
                            <div
                                className="text-xs rounded-2xl p-3 flex items-start gap-2.5 bg-emerald-50/70 border border-emerald-100 text-emerald-950"
                                data-testid="confirmation-wa-note"
                            >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-700 mt-0.5 shrink-0" />
                                <div>
                                    A WhatsApp confirmation was sent to{" "}
                                    <b className="mono font-semibold">{data.patient?.phone}</b>.
                                    <div className="text-[11px] opacity-75 mt-0.5">
                                        Please arrive 10 minutes before your scheduled slot time.
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                                <Link
                                    to={`/dashboard/${data.clinic?.id}`}
                                    className="avsar-pill avsar-pill-primary flex-1 text-center justify-center text-sm"
                                    style={{ textDecoration: "none", height: 44 }}
                                    data-testid="back-to-dashboard"
                                >
                                    Back to dashboard
                                </Link>
                                <Link
                                    to="/"
                                    className="avsar-pill avsar-pill-secondary flex-1 text-center justify-center text-sm"
                                    style={{ textDecoration: "none", height: 44 }}
                                    data-testid="back-home"
                                >
                                    Home
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
