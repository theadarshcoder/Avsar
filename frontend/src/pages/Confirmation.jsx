import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
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
        <div>
            <section
                className="doctro-section"
                style={{ background: "#FFFFFF", marginTop: 12 }}
                data-testid="confirmation-page"
            >
                <div className="max-w-3xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-60">
                        Booking confirmed
                    </div>
                    <h1 className="font-serif text-4xl sm:text-5xl mt-2 mb-6">
                        You got the slot.
                    </h1>

                    {error && (
                        <div
                            className="doctro-card"
                            data-testid="confirmation-error"
                            style={{ background: "#FFE4E4" }}
                        >
                            {String(error)}
                        </div>
                    )}

                    {data && (
                        <div className="doctro-card" data-testid="confirmation-card">
                            <div className="text-xs uppercase tracking-widest opacity-60">
                                Appointment
                            </div>
                            <div className="font-serif text-3xl mt-1" data-testid="confirmation-appt">
                                {new Date(data.slot.startTime).toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                })}{" "}
                                · {data.slot.doctorName}
                            </div>
                            <div className="text-sm opacity-70 mt-1">
                                {data.clinic?.name}
                            </div>
                            <div className="border-t border-[rgba(16,16,20,0.1)] my-4"></div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <div className="text-xs uppercase tracking-widest opacity-60">
                                        Amount paid
                                    </div>
                                    <div
                                        className="font-serif text-3xl mono mt-1"
                                        data-testid="confirmation-amount"
                                    >
                                        ₹{Number(data.transaction.totalPaid).toLocaleString("en-IN")}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-widest opacity-60">
                                        Transaction
                                    </div>
                                    <div className="mono text-xs mt-1 break-all">
                                        {data.transaction.id}
                                    </div>
                                </div>
                            </div>
                            <div
                                className="mt-6 text-sm rounded-xl p-3"
                                style={{ background: "var(--doctro-cream)" }}
                                data-testid="confirmation-wa-note"
                            >
                                A WhatsApp confirmation was sent to{" "}
                                <b className="mono">{data.patient?.phone}</b>.{" "}
                                <span className="opacity-70">
                                    (Phase-1 build: message is logged to the mock outbox.)
                                </span>
                            </div>
                            <div className="mt-6 flex gap-3 flex-wrap">
                                <Link
                                    to={`/dashboard/${data.clinic?.id}`}
                                    className="doctro-pill doctro-pill-secondary"
                                    data-testid="back-to-dashboard"
                                >
                                    Back to dashboard
                                </Link>
                                <Link
                                    to="/"
                                    className="doctro-pill doctro-pill-secondary"
                                    data-testid="back-home"
                                >
                                    Home
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>
            <Footer />
        </div>
    );
}
