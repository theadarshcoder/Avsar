import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export default function PricingComparison() {
    const [expanded, setExpanded] = useState(false);

    const categories = [
        {
            name: "Standby Engine & Automation",
            rows: [
                {
                    feature: "Standby slot capacity",
                    free: "Up to 10 slots / mo",
                    standard: "Unlimited",
                    enterprise: "Unlimited across all chairs",
                },
                {
                    feature: "Consent-first WhatsApp broadcasts",
                    free: true,
                    standard: true,
                    enterprise: "Dedicated WhatsApp Line",
                },
                {
                    feature: "Locked single-winner atomic checkout",
                    free: true,
                    standard: true,
                    enterprise: true,
                },
                {
                    feature: "Automated instant tie-break refunds",
                    free: true,
                    standard: true,
                    enterprise: true,
                },
                {
                    feature: "Priority pass credit issuance (14-day)",
                    free: false,
                    standard: true,
                    enterprise: "Configurable validity",
                },
                {
                    feature: "Patient refund-or-credit choice flow",
                    free: false,
                    standard: true,
                    enterprise: true,
                },
            ],
        },
        {
            name: "Economics & Compliance Guarantee",
            rows: [
                {
                    feature: "Commission on Doctor Consultation",
                    free: "0% (Keep 100%)",
                    standard: "0% (Keep 100%)",
                    enterprise: "0% (Keep 100%)",
                    highlight: true,
                },
                {
                    feature: "Handling fee charged to clinic",
                    free: "₹0 flat",
                    standard: "₹0 flat",
                    enterprise: "₹0 flat",
                    highlight: true,
                },
                {
                    feature: "Patient standby handling fee",
                    free: "₹50 flat",
                    standard: "₹50 flat",
                    enterprise: "Custom / Volume tier",
                },
                {
                    feature: "WhatsApp price-free compliance",
                    free: true,
                    standard: true,
                    enterprise: true,
                },
            ],
        },
        {
            name: "Analytics & Integrations",
            rows: [
                {
                    feature: "Real-time recovered revenue dashboard",
                    free: "Basic",
                    standard: "Full analytics",
                    enterprise: "Multi-branch rollup",
                },
                {
                    feature: "Live WhatsApp message delivery outbox",
                    free: true,
                    standard: true,
                    enterprise: true,
                },
                {
                    feature: "Multi-location / multi-chair management",
                    free: false,
                    standard: "Up to 5 chairs",
                    enterprise: "Unlimited branches & chairs",
                },
                {
                    feature: "Custom EHR / PMS PMS synchronization",
                    free: false,
                    standard: false,
                    enterprise: true,
                },
                {
                    feature: "Support & SLA",
                    free: "Email support",
                    standard: "Priority WhatsApp & Email",
                    enterprise: "Dedicated Account Manager & 24/7 SLA",
                },
            ],
        },
    ];

    return (
        <div className="mt-14 border border-black/10 rounded-3xl bg-[#FAF8F5]/60 p-6 sm:p-8 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/10">
                <div>
                    <div className="text-xs uppercase tracking-widest font-semibold opacity-60">
                        Feature Matrix
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl mt-1 text-[#101014]">
                        Compare all plan features & capabilities
                    </h3>
                </div>
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#101014] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors self-start sm:self-auto"
                >
                    {expanded ? (
                        <>
                            <span>Hide Detailed Matrix</span>
                            <ChevronUp className="w-4 h-4" />
                        </>
                    ) : (
                        <>
                            <span>View Full Comparison</span>
                            <ChevronDown className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>

            {/* Expandable Table Content */}
            {expanded && (
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[620px]">
                        <thead>
                            <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-[#101014]/60">
                                <th className="py-4 pr-4 font-semibold w-2/5">Feature</th>
                                <th className="py-4 px-4 font-semibold w-1/5">Free Trial</th>
                                <th className="py-4 px-4 font-bold text-[#101014] w-1/5 bg-amber-50/50 rounded-t-xl">
                                    Standard Pro ⭐
                                </th>
                                <th className="py-4 pl-4 font-semibold w-1/5">Enterprise</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {categories.map((cat) => (
                                <tr key={cat.name} className="contents">
                                    <tr className="bg-black/[0.02]">
                                        <td
                                            colSpan="4"
                                            className="py-3 px-2 text-xs font-bold uppercase tracking-widest text-[#101014]/80 pt-6"
                                        >
                                            {cat.name}
                                        </td>
                                    </tr>
                                    {cat.rows.map((row) => (
                                        <tr
                                            key={row.feature}
                                            className={`hover:bg-black/[0.015] transition-colors ${
                                                row.highlight ? "font-medium" : ""
                                            }`}
                                        >
                                            <td className="py-3.5 pr-4 text-xs sm:text-sm text-[#101014]/90">
                                                {row.feature}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-[#101014]/75">
                                                {renderCell(row.free)}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs font-semibold text-[#101014] bg-amber-50/50">
                                                {renderCell(row.standard)}
                                            </td>
                                            <td className="py-3.5 pl-4 text-xs text-[#101014]/75">
                                                {renderCell(row.enterprise)}
                                            </td>
                                        </tr>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function renderCell(val) {
    if (val === true) {
        return (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
        );
    }
    if (val === false) {
        return (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-100 text-neutral-400">
                <X className="w-3.5 h-3.5" />
            </span>
        );
    }
    return <span>{val}</span>;
}
