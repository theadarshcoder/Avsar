import Nav from "../components/Nav";
import PricingSection from "../components/pricing/PricingSection";

export default function PricingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <div className="flex-1 pt-6">
                <PricingSection isStandalone />
            </div>
        </div>
    );
}
