export default function Footer() {
    return (
        <footer
            className="doctro-section section-bg-ink"
            data-testid="footer"
            style={{ marginBottom: 24 }}
        >
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
                <div>
                    <div className="font-serif text-3xl mb-3">doctro</div>
                    <p className="text-sm opacity-75 max-w-[240px]">
                        Standby appointments for dental clinics in India. Consent-first,
                        flat-fee, single-winner checkout.
                    </p>
                </div>
                <FooterCol
                    title="Product"
                    links={[
                        ["How it works", "#how"],
                        ["ROI calculator", "#roi"],
                        ["Pricing", "#pricing"],
                        ["Compliance", "#compliance"],
                    ]}
                />
                <FooterCol
                    title="Support"
                    links={[
                        ["Demo dashboard", "/dashboard/clinic_smile_dental_indiranagar"],
                        ["Docs (OpenAPI)", "/api/openapi.json"],
                        ["Status", "#"],
                    ]}
                />
                <div>
                    <div className="text-sm font-semibold mb-3 opacity-90">Company</div>
                    <ul className="space-y-2 text-sm opacity-75">
                        <li>hello@doctro.in</li>
                        <li>+91 99000 00001</li>
                        <li>Indiranagar, Bengaluru</li>
                    </ul>
                </div>
            </div>
            <div className="max-w-6xl mx-auto mt-14 pt-6 border-t border-white/10 text-xs opacity-60 flex flex-wrap gap-4 justify-between">
                <span>© {new Date().getFullYear()} doctro. Built for Indian dental clinics.</span>
                <span>Phase-1 demo build — WhatsApp is MOCKED; Razorpay is real (test mode).</span>
            </div>
        </footer>
    );
}

function FooterCol({ title, links }) {
    return (
        <div>
            <div className="text-sm font-semibold mb-3 opacity-90">{title}</div>
            <ul className="space-y-2 text-sm opacity-75">
                {links.map(([label, href]) => (
                    <li key={label}>
                        <a href={href} className="hover:opacity-100">
                            {label}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
