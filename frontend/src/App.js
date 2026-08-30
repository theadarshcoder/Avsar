import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import Choice from "./pages/Choice";

import PricingPage from "./pages/PricingPage";

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
                    <Route path="/dashboard/:clinicId" element={<Dashboard />} />
                    <Route path="/checkout/:slotToken" element={<Checkout />} />
                    <Route path="/confirmation/:bookingId" element={<Confirmation />} />
                    <Route path="/choice/:transactionId" element={<Choice />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
}

export default App;
