import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginClinic } from "@/lib/apiClient";
import { Lock, Mail, ArrowRight, AlertCircle, KeyRound, Shield, Calendar, Users } from "lucide-react";

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
        const demoEmail = "demo@smiledental.in";
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
        <div className="h-screen w-screen overflow-hidden flex" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
            {/* ─── LEFT PANEL: Brand & Hero ─── */}
            <div
                className="hidden lg:flex lg:w-[55%] relative flex-col justify-between overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0ea5e9 100%)",
                }}
            >
                {/* Decorative blurred orbs */}
                <div className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
                    style={{ background: "radial-gradient(circle, #38bdf8, transparent 70%)" }} />
                <div className="absolute bottom-[-100px] right-[-60px] w-[350px] h-[350px] rounded-full opacity-15"
                    style={{ background: "radial-gradient(circle, #818cf8, transparent 70%)" }} />

                {/* Content */}
                <div className="relative z-10 p-12 pt-14 flex flex-col h-full">
                    {/* Logo */}
                    <Link to="/" className="inline-flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <span className="text-lg font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>A</span>
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                            Avsar
                        </span>
                    </Link>

                    {/* Hero Copy */}
                    <div className="mt-auto mb-auto">
                        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                            Smarter waitlists.
                            <br />
                            <span className="text-sky-300">Happier patients.</span>
                        </h1>
                        <p className="text-base text-slate-300 mt-6 max-w-md leading-relaxed">
                            The modern way to manage standby appointments, fill last-minute cancellations, and keep your dental clinic running at full capacity.
                        </p>

                        {/* Feature Pills */}
                        <div className="flex flex-wrap gap-3 mt-8">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white">
                                <Calendar className="w-4 h-4 text-sky-300" />
                                Live Scheduling
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white">
                                <Users className="w-4 h-4 text-sky-300" />
                                Patient Waitlists
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-white">
                                <Shield className="w-4 h-4 text-sky-300" />
                                Secure & HIPAA-ready
                            </div>
                        </div>
                    </div>

                    {/* Bottom stats */}
                    <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
                        <div>
                            <p className="text-2xl font-bold text-white">500+</p>
                            <p className="text-xs text-slate-400 mt-1">Clinics onboarded</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">12K+</p>
                            <p className="text-xs text-slate-400 mt-1">Patients managed</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">99.9%</p>
                            <p className="text-xs text-slate-400 mt-1">Uptime guarantee</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── RIGHT PANEL: Sign In Form ─── */}
            <div className="w-full lg:w-[45%] flex flex-col items-center justify-center bg-white px-6 sm:px-12 lg:px-16 py-10 relative">
                {/* Mobile Logo (hidden on desktop) */}
                <div className="lg:hidden mb-10 text-center">
                    <Link to="/" className="inline-flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
                            <span className="text-base font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>A</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                            Avsar
                        </span>
                    </Link>
                </div>

                {/* Form Container */}
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Welcome back
                        </h2>
                        <p className="text-sm text-slate-500 mt-2">
                            {redirectTo === "pricing"
                                ? "Sign in to purchase a subscription"
                                : "Sign in to your clinic dashboard"}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-sm flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="doctor@clinic.in"
                                    className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-900/10"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-400 font-medium">OR</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {/* Quick Login */}
                    <button
                        type="button"
                        onClick={handleQuickLogin}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 text-sky-700 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <KeyRound className="w-4 h-4" />
                        Sign in with demo credentials
                    </button>

                    {/* Test Credentials Info */}
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2.5">
                            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                                Demo credentials
                            </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Email</span>
                                <code className="text-slate-700 font-semibold bg-white px-2 py-0.5 rounded text-[11px] border border-slate-100">demo@smiledental.in</code>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Password</span>
                                <code className="text-slate-700 font-semibold bg-white px-2 py-0.5 rounded text-[11px] border border-slate-100">password123</code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 left-0 right-0 text-center">
                    <p className="text-xs text-slate-400">
                        Secured with 256-bit encryption · Avsar
                    </p>
                </div>
            </div>
        </div>
    );
}
