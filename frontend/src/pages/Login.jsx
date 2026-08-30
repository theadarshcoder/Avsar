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
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#FFFFFF" }}>
            <div className="flex-none">
                <Nav />
            </div>

            <div className="flex-1 p-4 md:p-6 pb-6 overflow-hidden flex flex-col">
                <section
                    className="section-bg-cream flex-1 rounded-[32px] flex flex-col justify-center items-center relative"
                    style={{ margin: 0, padding: "40px 20px" }}
                >
                    <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        
                        {/* Left: Text */}
                        <div className="text-center lg:text-left">
                            <div className="text-xs uppercase tracking-[0.25em] opacity-60 mb-6">
                                Business access
                            </div>
                            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
                                Sign in to your business dashboard.
                            </h1>
                            <p className="mt-6 text-base sm:text-lg max-w-xl opacity-80 mx-auto lg:mx-0">
                                {redirectTo === "pricing"
                                    ? "Sign in to purchase a subscription plan for your business."
                                    : "Access your live schedule, manage standby waitlists, and track recovered appointments."}
                            </p>
                        </div>

                        {/* Right: Form & Test Credentials */}
                        <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
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
                                    <div style={{ marginBottom: 16 }}>
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
                                            placeholder="professional@business.in"
                                            style={{
                                                width: "100%",
                                                padding: "12px 16px",
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
                                                padding: "12px 16px",
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
                                        style={{ width: "100%", height: "48px", minWidth: "unset" }}
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
                                        style={{ width: "100%", height: "48px", minWidth: "unset", fontSize: "14px" }}
                                    >
                                        <KeyRound style={{ width: 16, height: 16, marginRight: 8, opacity: 0.6 }} />
                                        Sign in with test credentials
                                    </button>
                                </div>
                            </div>

                            <p style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.5, textAlign: "center", marginTop: 20 }}>
                                Need access for your business? Contact your administrator or write to us at support.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
