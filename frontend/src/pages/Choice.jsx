import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import RefundOrCreditChoice from "../components/checkout/RefundOrCreditChoice";
import { getTransaction, submitChoice } from "../lib/apiClient";

export default function Choice() {
    const { transactionId } = useParams();
    const [data, setData] = useState(null);
    const [outcome, setOutcome] = useState(null); // {choice, result}
    const [alreadyDone, setAlreadyDone] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;
        getTransaction(transactionId)
            .then((d) => {
                if (!alive) return;
                setData(d);
                // If the choice has already been resolved (refund initiated
                // or priority pass issued), reflect that state on load
                // instead of showing the picker again.
                const t = d?.transaction || {};
                if (t.refundStatus) {
                    setOutcome({
                        choice: "refund",
                        result: { refundId: t.refundId, amount: t.refundAmount || t.totalPaid },
                    });
                } else if (t.creditIssuedPassId) {
                    setOutcome({
                        choice: "credit",
                        result: {
                            priorityPass: {
                                id: t.creditIssuedPassId,
                                amount: t.totalPaid,
                                expiresAt: t.creditIssuedPassExpiresAt || null,
                            },
                        },
                    });
                }
            })
            .catch((e) => alive && setError(e?.response?.data?.detail || String(e)));
        return () => {
            alive = false;
        };
    }, [transactionId]);

    const onSubmit = async (choice) => {
        setError(null);
        try {
            const result = await submitChoice(transactionId, choice);
            setOutcome({ choice, result });
        } catch (e) {
            const status = e?.response?.status;
            const detail = e?.response?.data?.detail;
            if (status === 409) {
                setAlreadyDone(true);
                setError(detail || "You've already made a choice for this booking.");
            } else {
                setError(detail || String(e));
            }
        }
    };

    return (
        <div>
            <Nav />
            <section
                className="doctro-section section-bg-peach"
                style={{ marginTop: 12 }}
                data-testid="choice-page"
            >
                <div className="max-w-4xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-70">
                        Your booking was cancelled by the clinic
                    </div>
                    <h1 className="font-serif text-4xl sm:text-5xl mt-2 mb-3">
                        Refund or priority pass — you choose.
                    </h1>
                    {data && (
                        <p className="opacity-80 max-w-2xl mb-6">
                            We're sorry about your {new Date(data.slot.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} appointment with{" "}
                            <b>{data.slot.doctorName}</b> at <b>{data.clinic.name}</b> being
                            cancelled. Please pick how you'd like your{" "}
                            <b>₹{Number(data.transaction.totalPaid).toLocaleString("en-IN")}</b> back.
                        </p>
                    )}

                    {error && (
                        <div
                            className="doctro-card mb-6"
                            style={{ background: "#FFE4E4" }}
                            data-testid="choice-error"
                        >
                            {String(error)}
                        </div>
                    )}

                    {!outcome && !alreadyDone && data && (
                        <RefundOrCreditChoice
                            amount={data.transaction.totalPaid}
                            onSubmit={onSubmit}
                        />
                    )}

                    {outcome?.choice === "refund" && (
                        <div className="doctro-card" data-testid="choice-refund-done">
                            <div className="font-serif text-3xl mb-2">Refund initiated.</div>
                            <p className="opacity-80 text-sm">
                                Refund reference:{" "}
                                <span className="mono">{outcome.result.refundId}</span>. It'll
                                land back on your original payment method in 5–7 business days.
                            </p>
                        </div>
                    )}
                    {outcome?.choice === "credit" && (
                        <div className="doctro-card" data-testid="choice-credit-done">
                            <div className="font-serif text-3xl mb-2">Priority pass issued.</div>
                            <p className="opacity-80 text-sm mb-3">
                                Your credit of{" "}
                                <b className="mono">₹{Number(outcome.result.priorityPass.amount).toLocaleString("en-IN")}</b>{" "}
                                will auto-apply to your next standby appointment at this clinic.
                            </p>
                            <div className="mono text-xs opacity-60">
                                Pass id: {outcome.result.priorityPass.id} · Expires:{" "}
                                {new Date(outcome.result.priorityPass.expiresAt).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                    {alreadyDone && (
                        <div className="doctro-card" data-testid="choice-already-done">
                            <div className="font-serif text-3xl mb-2">
                                A choice was already made.
                            </div>
                            <p className="opacity-80 text-sm">
                                Refund or credit was already applied for this booking. If you
                                think this is wrong, please contact the clinic.
                            </p>
                        </div>
                    )}
                </div>
            </section>
            <Footer />
        </div>
    );
}
