import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginClinic } from "@/lib/apiClient";
import { Lock, Mail, ArrowRight, AlertCircle, KeyRound } from "lucide-react";

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Read optional redirect params:
    // ?redirect=pricing  → from pricing page (unauthenticated subscribe click)
    // ?from=/dashboard/… → from ProtectedRoute (direct URL access)
    const params = new URLSearchParams(location.search);
    const redirectTo = params.get("redirect");
    const fromPath = params.get("from");

    const _doLogin = async (emailVal, passVal) => {
        const data = await loginClinic({ email: emailVal, password: passVal });
        localStorage.setItem("avsar_clinic_token", data.token);
        localStorage.setItem("avsar_clinic", JSON.stringify(data.clinic));
        // If ProtectedRoute sent us here with a ?from= path, bounce back there.
        // Otherwise always go to the clinic dashboard.
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
        <div className="h-screen w-screen overflow-hidden flex items-center justify-center p-4 sm:p-6 bg-[#FBFBFC]">
            {/* Split Container Card */}
            <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-neutral-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-12">

                {/* LEFT SIDE: Brand & Purpose */}
                <div className="md:col-span-6 bg-[#F8F9FA] p-8 sm:p-10 border-b md:border-b-0 md:border-r border-neutral-200/80 flex flex-col justify-between">
                    <div>
                        <Link
                            to="/"
                            className="inline-block font-serif text-2xl font-bold tracking-tight text-[#101014] hover:opacity-80 transition-opacity"
                        >
                            Avsar
                        </Link>

                        <div className="mt-8">
                            <h1 className="font-serif text-2xl sm:text-3xl text-[#101014] leading-snug">
                                Standby appointment management for dental clinics.
                            </h1>
                            <p className="text-sm text-neutral-600 mt-3 leading-relaxed">
                                Access your live clinic schedule, monitor patient standby notifications, and manage confirmed bookings.
                            </p>
                        </div>

                        {/* Test Credentials Box */}
                        <div className="mt-8 p-4 rounded-xl bg-white border border-neutral-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                                    Test Credentials
                                </span>
                            </div>
                            <div className="space-y-1.5 text-xs font-mono">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-neutral-500">Email</span>
                                    <span className="text-neutral-900 font-semibold">demo@smiledental.in</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-neutral-500">Password</span>
                                    <span className="text-neutral-900 font-semibold">password123</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-neutral-200/60">
                        <p className="text-xs text-neutral-500">
                            Need access for your clinic? Contact your administrator or support team.
                        </p>
                    </div>
                </div>

                {/* RIGHT SIDE: Sign In Form */}
                <div className="md:col-span-6 p-8 sm:p-10 flex flex-col justify-between bg-white">
                    <div>
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-[#101014] tracking-tight">
                                Clinic Sign In
                            </h2>
                            <p className="text-xs text-neutral-500 mt-1">
                                {redirectTo === "pricing"
                                    ? "Sign in to purchase a subscription"
                                    : "Enter your email and password to continue"}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="doctor@clinic.in"
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 py-2.5 px-4 bg-[#101014] hover:bg-neutral-800 active:scale-[0.99] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? "Signing in..." : "Sign In"}
                                {!loading && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </form>

                        <div className="mt-4 pt-4 border-t border-neutral-100 text-center">
                            <button
                                type="button"
                                onClick={handleQuickLogin}
                                disabled={loading}
                                className="text-xs text-neutral-600 hover:text-neutral-900 font-medium underline underline-offset-4 transition-colors"
                            >
                                Sign in with test credentials
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-[11px] text-neutral-400">
                            Secured clinic login · Avsar
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
