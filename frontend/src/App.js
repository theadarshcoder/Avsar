import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import Choice from "./pages/Choice";
import PricingPage from "./pages/PricingPage";

/** Redirects unauthenticated users to /login */
function ProtectedRoute({ children }) {
    const location = useLocation();
    const token = localStorage.getItem("avsar_clinic_token");
    if (!token) {
        return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;
    }
    return children;
}

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Nav />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Login />} />
                    <Route
                        path="/dashboard/:clinicId"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/checkout/:slotToken" element={<Checkout />} />
                    <Route path="/confirmation/:bookingId" element={<Confirmation />} />
                    <Route path="/choice/:transactionId" element={<Choice />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
}

export default App;
