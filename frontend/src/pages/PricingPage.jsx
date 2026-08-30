import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PricingSection from "../components/pricing/PricingSection";

export default function PricingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <div className="flex-1 pt-6">
                <PricingSection isStandalone />
            </div>
            <Footer />
        </div>
    );
}
