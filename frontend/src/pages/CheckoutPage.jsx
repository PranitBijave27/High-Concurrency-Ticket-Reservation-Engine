import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import API from "../api/client";
import SeatHoldTimer from "../components/SeatHoldTimer";

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    API.get(`/bookings/${bookingId}`)
      .then((res) => {
        const data = res.data.data;
        setBooking(data);
        if (data.status === "expired" || (data.expiresAt && new Date(data.expiresAt) <= new Date())) {
          setIsExpired(true);
        }
      })
      .catch((err) => setError(err.message || "Failed to load booking"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Payment Confirmation
  const handleConfirmPayment = async () => {
    try {
      setPaying(true);
      setError("");
      const res = await API.patch(`/bookings/${bookingId}/confirm`);
      setBooking(res.data.data);
    } catch (err) {
      setError(err.message || "Payment authorization failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  // Immediate Hold Cancellation / Release
  const handleCancelHold = async () => {
    if (!window.confirm("Release these seats back to available inventory?")) return;
    try {
      setCancelling(true);
      setError("");
      await API.patch(`/bookings/${bookingId}/cancel`);
      navigate(`/shows/${booking?.showId?._id || booking?.showId}/seats`);
    } catch (err) {
      setError(err.message || "Failed to release hold.");
      setCancelling(false);
    }
  };

  if (loading) return <div className="container"><p>Loading reservation details...</p></div>;
  if (!booking) return <div className="container"><div className="alert-error">{error || "Booking not found"}</div></div>;

  const show = booking.showId;
  const movie = show?.movieId;
  const theater = show?.screenId?.theaterId;
  const seats = booking.seats || [];

  // STATE 1: CONFIRMED
  if (booking.status === "confirmed") {
    return (
      <div className="container" style={{ maxWidth: "600px" }}>
        <div className="card" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✅</div>
          <h2 style={{ fontSize: "1.5rem", color: "#10b981", marginBottom: "0.5rem" }}>
            Booking Confirmed!
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Reference: <strong style={{ color: "#f8fafc" }}>BKG-{booking._id.slice(-8).toUpperCase()}</strong>
          </p>

          <div style={{ textAlign: "left", background: "#1e293b", padding: "1rem", borderRadius: "6px", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            <p><strong>Movie:</strong> {movie?.title}</p>
            <p><strong>Cinema:</strong> {theater?.name} ({show?.screenId?.name})</p>
            <p><strong>Showtime:</strong> {new Date(show?.startTime).toLocaleString()}</p>
            <p><strong>Seats:</strong> {seats.map((s) => `${s.row}${s.number}`).join(", ")}</p>
            <p><strong>Amount Paid:</strong> ₹{booking.totalAmount}</p>
          </div>

          <Link to="/" className="btn btn-primary" style={{ width: "100%" }}>
            Return to Movies
          </Link>
        </div>
      </div>
    );
  }

  // STATE 2: EXPIRED
  if (isExpired || booking.status === "expired") {
    return (
      <div className="container" style={{ maxWidth: "500px", textAlign: "center" }}>
        <div className="card" style={{ padding: "2rem 1rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          <h2 style={{ fontSize: "1.4rem", color: "#ef4444", marginBottom: "0.5rem" }}>
            Seat Hold Expired
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            The 5-minute reservation timer ended. Held seats have been returned to available inventory.
          </p>
          <Link to={`/shows/${show?._id || show}/seats`} className="btn btn-primary">
            Pick Seats Again
          </Link>
        </div>
      </div>
    );
  }

  // STATE 3: PENDING CHECKOUT
  return (
    <div className="container" style={{ maxWidth: "600px" }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: "1rem" }}>
        ← Back to Seats
      </button>

      {/* 5-minute Hold Timer */}
      <SeatHoldTimer expiresAt={booking.expiresAt} onExpire={() => setIsExpired(true)} />

      {error && <div className="alert-error">{error}</div>}

      {/* Booking Summary */}
      <div className="card">
        <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>{movie?.title || "Movie Ticket"}</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {theater?.name} • {new Date(show?.startTime).toLocaleString()}
        </p>

        <div style={{ borderTop: "1px solid #1e293b", paddingTop: "0.75rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.9rem", marginBottom: "0.35rem" }}>
            <strong>Seats ({seats.length}):</strong>{" "}
            {seats.map((s) => `Row ${s.row}-${s.number} (${s.type})`).join(", ")}
          </p>
          <p style={{ fontSize: "1.2rem", fontWeight: "700", color: "#10b981", marginTop: "0.5rem" }}>
            Total Amount: ₹{booking.totalAmount}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            onClick={handleConfirmPayment}
            disabled={paying || cancelling}
            className="btn btn-success"
            style={{ width: "100%", padding: "0.75rem" }}
          >
            {paying ? "Processing Payment..." : `Pay ₹${booking.totalAmount} & Confirm Booking`}
          </button>

          <button
            onClick={handleCancelHold}
            disabled={paying || cancelling}
            className="btn btn-danger"
            style={{ width: "100%", padding: "0.55rem" }}
          >
            {cancelling ? "Releasing Seats..." : "Release Seats & Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
