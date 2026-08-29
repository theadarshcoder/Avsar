import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import Choice from "./pages/Choice";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
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
