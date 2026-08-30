import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Craft.do-style floating pill navigation bar.
 * Public links: Home, How it works, ROI Calculator, Pricing.
 * Dashboard is private / accessible via Clinic Login or direct clinic URL.
 */
export default function Nav() {
    const location = useLocation();
    const navigate = useNavigate();

    const isAuthPage =
        location.pathname === "/login" ||
        location.pathname === "/register" ||
        location.pathname.startsWith("/checkout") ||
        location.pathname.startsWith("/confirmation") ||
        location.pathname.startsWith("/choice");

    const [activeTab, setActiveTab] = useState("home");
    const [hoveredTab, setHoveredTab] = useState(null);

    const containerRef = useRef(null);
    const tabsRef = useRef({});
    const isProgrammaticScroll = useRef(false);
    const scrollTimeoutRef = useRef(null);

    const [activeRect, setActiveRect] = useState({ left: 0, width: 0, ready: false });
    const [hoverRect, setHoverRect] = useState({ left: 0, width: 0, ready: false });

    // Public webpage sections
    const navItems = [
        {
            id: "home",
            label: "Home",
            to: "/",
            isAnchor: false,
            testid: "nav-home",
        },
        {
            id: "how",
            label: "How it works",
            to: "#how",
            isAnchor: true,
            testid: "nav-how",
        },
        {
            id: "roi",
            label: "ROI Calculator",
            to: "#roi",
            isAnchor: true,
            testid: "nav-roi",
        },
        {
            id: "pricing",
            label: "Pricing",
            to: "#pricing",
            isAnchor: true,
            testid: "nav-pricing",
        },
    ];

    // Measure active tab element relative to container
    const updateActiveRect = useCallback((tabId) => {
        const el = tabsRef.current[tabId];
        const container = containerRef.current;
        if (el && container) {
            const elBcr = el.getBoundingClientRect();
            const containerBcr = container.getBoundingClientRect();
            setActiveRect({
                left: elBcr.left - containerBcr.left,
                width: elBcr.width,
                ready: true,
            });
        }
    }, []);

    // Measure hovered tab element
    const updateHoverRect = useCallback((tabId) => {
        if (!tabId) {
            setHoverRect((prev) => ({ ...prev, ready: false }));
            return;
        }
        const el = tabsRef.current[tabId];
        const container = containerRef.current;
        if (el && container) {
            const elBcr = el.getBoundingClientRect();
            const containerBcr = container.getBoundingClientRect();
            setHoverRect({
                left: elBcr.left - containerBcr.left,
                width: elBcr.width,
                ready: true,
            });
        }
    }, []);

    // Update active tab bounding box on tab change or resize
    useEffect(() => {
        updateActiveRect(activeTab);
        const handleResize = () => updateActiveRect(activeTab);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [activeTab, updateActiveRect]);

    // Sync active tab with location route
    useEffect(() => {
        if (location.pathname === "/" && !isProgrammaticScroll.current) {
            if (!location.hash) {
                setActiveTab("home");
            }
        }
    }, [location.pathname, location.hash]);

    // ScrollSpy — active only when user scrolls manually on the home page
    useEffect(() => {
        if (location.pathname !== "/") return;

        const handleScroll = () => {
            if (isProgrammaticScroll.current) return;

            const scrollPos = window.scrollY + 220;
            const pricingEl = document.getElementById("pricing");
            const roiEl = document.getElementById("roi");
            const howEl = document.getElementById("how");

            if (pricingEl && scrollPos >= pricingEl.offsetTop) {
                setActiveTab("pricing");
            } else if (roiEl && scrollPos >= roiEl.offsetTop) {
                setActiveTab("roi");
            } else if (howEl && scrollPos >= howEl.offsetTop) {
                setActiveTab("how");
            } else {
                setActiveTab("home");
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [location.pathname]);

    // Handle smooth tab clicks
    const handleItemClick = (e, item) => {
        isProgrammaticScroll.current = true;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            isProgrammaticScroll.current = false;
        }, 900);

        setActiveTab(item.id);

        if (item.isAnchor) {
            e.preventDefault();
            if (location.pathname !== "/") {
                navigate(`/${item.to}`);
                setTimeout(() => {
                    const el = document.querySelector(item.to);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 80);
            } else {
                const el = document.querySelector(item.to);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    };

    if (isAuthPage) {
        return null;
    }

    return (
        <header
            className="sticky top-4 z-50 w-full flex justify-center px-4 pointer-events-none"
            data-testid="nav-bar"
        >
            <nav className="pointer-events-auto w-full max-w-5xl flex items-center justify-between bg-white/65 backdrop-blur-2xl rounded-full px-4 sm:px-6 py-2 shadow-[0_8px_32px_0_rgba(31,38,135,0.06),0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 transition-all duration-300">
                {/* Left Brand Logo */}
                <Link
                    to="/"
                    data-testid="nav-brand"
                    onClick={(e) => handleItemClick(e, navItems[0])}
                    className="font-serif tracking-tight font-bold text-[22px] sm:text-[24px] text-[#101014] hover:opacity-80 transition-opacity select-none pl-1"
                >
                    doctro
                </Link>

                {/* Center Public Section Links with Single Continuous Sliding Pill */}
                <div
                    ref={containerRef}
                    className="hidden md:flex items-center relative bg-black/[0.04] backdrop-blur-md p-1 rounded-full border border-black/[0.03]"
                    onMouseLeave={() => {
                        setHoveredTab(null);
                        updateHoverRect(null);
                    }}
                >
                    {/* Active Black Gliding Capsule */}
                    {activeRect.ready && (
                        <motion.div
                            className="absolute top-1 bottom-1 bg-[#101014] rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.25)] pointer-events-none z-0"
                            animate={{
                                x: activeRect.left,
                                width: activeRect.width,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 420,
                                damping: 32,
                                mass: 0.55,
                            }}
                            style={{ borderRadius: 9999 }}
                        />
                    )}

                    {/* Hover Spotlight Preview */}
                    <AnimatePresence>
                        {hoveredTab && hoveredTab !== activeTab && hoverRect.ready && (
                            <motion.div
                                className="absolute top-1 bottom-1 bg-black/[0.06] rounded-full pointer-events-none z-0"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{
                                    x: hoverRect.left,
                                    width: hoverRect.width,
                                    opacity: 1,
                                    scale: 1,
                                }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 35,
                                    mass: 0.5,
                                }}
                                style={{ borderRadius: 9999 }}
                            />
                        )}
                    </AnimatePresence>

                    {/* Public Section Links */}
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;

                        return (
                            <Link
                                key={item.id}
                                ref={(el) => (tabsRef.current[item.id] = el)}
                                to={item.to}
                                data-testid={item.testid}
                                onClick={(e) => handleItemClick(e, item)}
                                onMouseEnter={() => {
                                    setHoveredTab(item.id);
                                    updateHoverRect(item.id);
                                }}
                                className={`relative z-10 px-4 py-1.5 text-[13.5px] font-medium rounded-full transition-colors duration-200 select-none ${
                                    isActive
                                        ? "text-white"
                                        : "text-[#202024] hover:text-black"
                                }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Right Action CTA Button (Matching Craft Navbar: "Log in" / "Get Started") */}
                <div className="flex items-center gap-3">
                    <Link
                        to="/login"
                        data-testid="nav-login"
                        className="text-[13.5px] font-medium text-[#202024] hover:text-black transition-colors px-2 py-1 select-none"
                    >
                        Log in
                    </Link>
                    <a
                        href="/#pricing"
                        onClick={(e) => handleItemClick(e, navItems[3])}
                        data-testid="nav-cta-try"
                        className="bg-[#101014] text-white text-[13.5px] font-semibold px-4.5 py-1.5 sm:px-5 sm:py-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:bg-neutral-800 hover:shadow-[0_4px_14px_rgba(0,0,0,0.28)] active:scale-95 transition-all duration-200 select-none"
                    >
                        Get Started
                    </a>
                </div>
            </nav>
        </header>
    );
}
