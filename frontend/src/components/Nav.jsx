import { Link, useLocation } from "react-router-dom";

/**
 * Rounded pill nav — NOT full width, with margin from top/sides.
 */
export default function Nav() {
    const loc = useLocation();
    const active = (p) => loc.pathname === p;
    return (
        <div className="w-full flex justify-center pt-6 px-4" data-testid="nav-bar">
            <nav className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-[0_2px_16px_rgba(16,16,20,0.08)] border border-[rgba(16,16,20,0.06)]">
                <Link
                    to="/"
                    data-testid="nav-brand"
                    className="font-serif text-[22px] tracking-tight px-4 py-1"
                    style={{ color: "var(--doctro-ink)" }}
                >
                    doctro
                </Link>
                <div className="flex items-center gap-1 pr-1">
                    <NavLink to="/" label="Home" active={active("/")} testid="nav-home" />
                    <NavLink
                        to="/dashboard/clinic_smile_dental_indiranagar"
                        label="Demo dashboard"
                        active={loc.pathname.startsWith("/dashboard")}
                        testid="nav-dashboard"
                    />
                </div>
            </nav>
        </div>
    );
}

function NavLink({ to, label, active, testid }) {
    return (
        <Link
            to={to}
            data-testid={testid}
            className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                active
                    ? "bg-[var(--doctro-ink)] text-white"
                    : "text-[var(--doctro-ink)] hover:bg-[var(--doctro-cream)]"
            }`}
        >
            {label}
        </Link>
    );
}
