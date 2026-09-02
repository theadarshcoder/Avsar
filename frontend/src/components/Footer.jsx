export default function Footer() {
    return (
        <footer
            className="avsar-section section-bg-ink font-serif"
            data-testid="footer"
            style={{ padding: "48px 40px", marginBottom: 24 }}
        >
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
                    {/* ── COLUMN 1: BRAND LOGO, SOCIALS & REGISTRATION ── */}
                    <div className="lg:col-span-4 flex flex-col items-start">
                        {/* Brand Name */}
                        <div className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#F5EFE1]">
                            Avsar
                        </div>

                        {/* Social Media Icons */}
                        <div className="flex items-center gap-4 mt-5 text-[#F5EFE1]/75">
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-white transition-colors"
                                aria-label="Instagram"
                            >
                                <InstagramIcon className="w-5 h-5" />
                            </a>
                            <a
                                href="https://x.com"
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-white transition-colors"
                                aria-label="X (Twitter)"
                            >
                                <XIcon className="w-4 h-4" />
                            </a>
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-white transition-colors"
                                aria-label="Facebook"
                            >
                                <FacebookIcon className="w-5 h-5" />
                            </a>
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-white transition-colors"
                                aria-label="LinkedIn"
                            >
                                <LinkedinIcon className="w-5 h-5" />
                            </a>
                        </div>

                        {/* Copyright & License Information */}
                        <div className="mt-6 text-xs text-[#F5EFE1]/50 space-y-1 leading-relaxed">
                            <p>© Avsar Technologies Private Limited</p>
                            <p>reg lic no : 1122499000872</p>
                        </div>
                    </div>

                    {/* ── COLUMN 2: NAVIGATION LIST 1 ── */}
                    <div className="lg:col-span-3">
                        <ul className="space-y-3.5 text-sm text-[#F5EFE1]/80">
                            {[
                                ["Home", "/"],
                                ["How It Works", "#how"],
                                ["ROI Calculator", "#roi"],
                                ["Careers", "#roi"],
                                ["Customer Support", "mailto:hello@avsar.in"],
                                ["Press", "#compliance"],
                                ["Mojo – an Avsar Blog", "#how"],
                                ["Avsar Standby System", "#pricing"],
                                ["Bestsellers & Pricing", "#pricing"],
                            ].map(([label, href]) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        className="hover:text-white transition-colors inline-block"
                                    >
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── COLUMN 3: NAVIGATION LIST 2 ── */}
                    <div className="lg:col-span-3">
                        <ul className="space-y-3.5 text-sm text-[#F5EFE1]/80">
                            {[
                                ["Privacy Policy", "#compliance"],
                                ["Terms of Use", "#compliance"],
                                ["Responsible Disclosure Policy", "#compliance"],
                                ["Partner with Avsar", "/login"],
                                ["Business Dashboard", "/dashboard/demo_business"],
                                ["Single-Winner Lock", "#compliance"],
                                ["OpenAPI Docs", "/api/openapi.json"],
                                ["Investor Relations", "mailto:hello@avsar.in"],
                            ].map(([label, href]) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        className="hover:text-white transition-colors inline-block"
                                    >
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── COLUMN 4: DOWNLOAD APP BUTTONS ── */}
                    <div className="lg:col-span-2">
                        <div className="text-sm font-medium text-[#F5EFE1] mb-3.5">
                            Download App
                        </div>

                        <div className="space-y-2.5">
                            {/* Google Play Store Button */}
                            <a
                                href="#playstore"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert("Avsar App coming soon on Google Play!");
                                }}
                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/30 transition-all group cursor-pointer"
                            >
                                <GooglePlayIcon className="w-5 h-5 shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-[#F5EFE1] group-hover:text-white">
                                    Get it on play store
                                </span>
                            </a>

                            {/* Apple App Store Button */}
                            <a
                                href="#appstore"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert("Avsar App coming soon on Apple App Store!");
                                }}
                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/30 transition-all group cursor-pointer"
                            >
                                <AppleIcon className="w-5 h-5 shrink-0 fill-current text-[#F5EFE1] group-hover:text-white" />
                                <span className="text-xs sm:text-sm font-medium text-[#F5EFE1] group-hover:text-white">
                                    Get it on app store
                                </span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

/* ── SOCIAL & APP STORE SVG ICONS ── */
function InstagramIcon({ className }) {
    return (
        <svg className={`${className} fill-none stroke-current stroke-2`} viewBox="0 0 24 24">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
    );
}

function XIcon({ className }) {
    return (
        <svg className={`${className} fill-current`} viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function FacebookIcon({ className }) {
    return (
        <svg className={`${className} fill-current`} viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    );
}

function LinkedinIcon({ className }) {
    return (
        <svg className={`${className} fill-current`} viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
    );
}

function GooglePlayIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M3.6 1.5c-.3.3-.5.8-.5 1.4v18.2c0 .6.2 1.1.5 1.4L13.1 12 3.6 1.5z" />
            <path fill="#34A853" d="M16.2 8.9L13.1 12l3.1 3.1 3.6-2.1c1-.6 1-1.5 0-2.1l-3.6-2z" />
            <path fill="#FBBC05" d="M3.6 22.5c.4.4 1 .4 1.6.1l11-6.4L13.1 12 3.6 22.5z" />
            <path fill="#EA4335" d="M3.6 1.5L13.1 12l3.1-4.2-11-6.4c-.6-.3-1.2-.3-1.6.1z" />
        </svg>
    );
}

function AppleIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.73c.62-.75 1.04-1.8 1.01-2.73-.9-.02-2.02.59-2.65 1.34-.56.65-.99 1.72-.94 2.64.97.08 2.02-.54 2.58-1.25z" />
        </svg>
    );
}
