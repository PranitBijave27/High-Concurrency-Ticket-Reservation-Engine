import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import MoviesPage from "./pages/MoviesPage";
import MovieDetailsPage from "./pages/MovieDetailsPage";
import SeatSelectionPage from "./pages/SeatSelectionPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Navbar />
          <Routes>
            <Route path="/" element={<MoviesPage />} />
            <Route path="/movies/:movieId" element={<MovieDetailsPage />} />
            <Route path="/shows/:showId/seats" element={<SeatSelectionPage />} />
            <Route path="/checkout/:bookingId" element={<CheckoutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
