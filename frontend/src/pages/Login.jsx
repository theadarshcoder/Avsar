import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginClinic } from "@/lib/apiClient";
import { ArrowRight, AlertCircle, KeyRound } from "lucide-react";
import Nav from "../components/Nav";

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const params = new URLSearchParams(location.search);
    const redirectTo = params.get("redirect");
    const fromPath = params.get("from");

    const _doLogin = async (emailVal, passVal) => {
        const data = await loginClinic({ email: emailVal, password: passVal });
        localStorage.setItem("avsar_clinic_token", data.token);
        localStorage.setItem("avsar_clinic", JSON.stringify(data.clinic));
        if (fromPath && fromPath.startsWith("/dashboard")) {
            navigate(fromPath);
        } else {
            navigate(`/dashboard/${data.clinic.id}`);
        }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await _doLogin(email, password);
        } catch (err) {
            const msg =
                err?.response?.data?.detail ||
                err?.message ||
                "Invalid email or password. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = async () => {
        const demoEmail = "demo@acmecenter.in";
        const demoPass = "password123";
        setEmail(demoEmail);
        setPassword(demoPass);
        setLoading(true);
        setError(null);
        try {
            await _doLogin(demoEmail, demoPass);
        } catch (err) {
            const msg =
                err?.response?.data?.detail ||
                err?.message ||
                "Login failed. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ background: "#FFFFFF" }}>
            <Nav />

            <section
                className="avsar-section section-bg-cream"
                style={{ marginTop: 12 }}
            >
                <div className="max-w-5xl mx-auto">
                    <div className="text-xs uppercase tracking-[0.25em] opacity-60 mb-4">
                        Business access
                    </div>
                    <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
                        Sign in to your business dashboard.
                    </h1>
                    <p className="mt-6 text-base sm:text-lg max-w-2xl opacity-80">
                        {redirectTo === "pricing"
                            ? "Sign in to purchase a subscription plan for your business."
                            : "Access your live schedule, manage standby waitlists, and track recovered appointments."}
                    </p>
                </div>
            </section>

            <section
                className="avsar-section"
                style={{ background: "#FFFFFF" }}
            >
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                    {/* Left: Sign In Form */}
                    <div>
                        <div className="avsar-card" style={{ padding: "32px" }}>
                            {error && (
                                <div
                                    style={{
                                        marginBottom: 20,
                                        padding: "12px 16px",
                                        borderRadius: 12,
                                        background: "#FEF2F2",
                                        border: "1px solid #FECACA",
                                        color: "#B91C1C",
                                        fontSize: 14,
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 10,
                                    }}
                                >
                                    <AlertCircle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: 20 }}>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: "var(--avsar-ink)",
                                            marginBottom: 6,
                                            opacity: 0.7,
                                        }}
                                    >
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="professional@clinic.in"
                                        style={{
                                            width: "100%",
                                            padding: "14px 16px",
                                            fontSize: 15,
                                            borderRadius: 12,
                                            border: "1px solid var(--avsar-line)",
                                            background: "#FAFAF8",
                                            outline: "none",
                                            transition: "border-color 150ms",
                                            fontFamily: "inherit",
                                            boxSizing: "border-box",
                                        }}
                                        onFocus={(e) => (e.target.style.borderColor = "var(--avsar-ink)")}
                                        onBlur={(e) => (e.target.style.borderColor = "var(--avsar-line)")}
                                    />
                                </div>

                                <div style={{ marginBottom: 24 }}>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: "var(--avsar-ink)",
                                            marginBottom: 6,
                                            opacity: 0.7,
                                        }}
                                    >
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        style={{
                                            width: "100%",
                                            padding: "14px 16px",
                                            fontSize: 15,
                                            borderRadius: 12,
                                            border: "1px solid var(--avsar-line)",
                                            background: "#FAFAF8",
                                            outline: "none",
                                            transition: "border-color 150ms",
                                            fontFamily: "inherit",
                                            boxSizing: "border-box",
                                        }}
                                        onFocus={(e) => (e.target.style.borderColor = "var(--avsar-ink)")}
                                        onBlur={(e) => (e.target.style.borderColor = "var(--avsar-line)")}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="avsar-pill avsar-pill-primary"
                                    style={{ width: "100%", minWidth: "unset" }}
                                >
                                    {loading ? "Signing in…" : "Sign in"}
                                    {!loading && <ArrowRight style={{ width: 18, height: 18, marginLeft: 8 }} />}
                                </button>
                            </form>

                            <div
                                style={{
                                    marginTop: 16,
                                    paddingTop: 16,
                                    borderTop: "1px solid var(--avsar-line)",
                                    textAlign: "center",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={handleQuickLogin}
                                    disabled={loading}
                                    className="avsar-pill avsar-pill-secondary"
                                    style={{ width: "100%", minWidth: "unset" }}
                                >
                                    <KeyRound style={{ width: 16, height: 16, marginRight: 8, opacity: 0.6 }} />
                                    Sign in with test credentials
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div>
                        <div className="avsar-card" style={{ padding: "32px", background: "var(--avsar-cream)" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", opacity: 0.5, marginBottom: 16 }}>
                                Test credentials
                            </div>
                            <div style={{ fontSize: 14, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ opacity: 0.6 }}>Email</span>
                                <code style={{ fontWeight: 700, fontSize: 13, background: "#FFFFFF", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(16,16,20,0.06)" }}>
                                    demo@acmecenter.in
                                </code>
                            </div>
                            <div style={{ fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ opacity: 0.6 }}>Password</span>
                                <code style={{ fontWeight: 700, fontSize: 13, background: "#FFFFFF", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(16,16,20,0.06)" }}>
                                    password123
                                </code>
                            </div>
                        </div>

                        <div style={{ marginTop: 20, padding: "0 4px" }}>
                            <p style={{ fontSize: 14, opacity: 0.6, lineHeight: 1.6 }}>
                                Need access for your business? Contact your administrator or write to us at support.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
