import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Ticket, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import API from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./MyBookingsPage.css";

export default function MyBookingsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/my-bookings" } } });
      return;
    }
    fetchMyBookings();
  }, [isAuthenticated]);

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/bookings/me");
      setBookings(res.data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      setActionLoading(bookingId);
      setError("");
      setSuccessMsg("");

      await API.patch(`/bookings/${bookingId}/cancel`);
      setSuccessMsg("Booking successfully cancelled and refund initiated.");
      fetchMyBookings(); // refresh list
    } catch (err) {
      setError(err.message || "Failed to cancel booking.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === "all") return true;
    return b.status === filter;
  });

  if (loading) {
    return (
      <div className="container" style={{ padding: "4rem 1rem", textAlign: "center" }}>
        <p style={{ color: "#94a3b8" }}>Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "860px" }}>
      <div className="bookings-header">
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>My Bookings</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            View your tickets and manage cancellations
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bookings-filter-bar">
          {["all", "confirmed", "cancelled", "expired"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`filter-tab ${filter === tab ? "active" : ""}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {successMsg && <div className="alert-success">{successMsg}</div>}

      {filteredBookings.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
            No {filter !== "all" ? filter : ""} bookings found.
          </p>
          <Link to="/" className="btn btn-primary">
            Explore Movies
          </Link>
        </div>
      ) : (
        filteredBookings.map((b) => {
          const show = b.showId;
          const movie = show?.movieId;
          const screen = show?.screenId;
          const theater = screen?.theaterId;
          const seats = b.seats || [];

          // 2-Hour Cancellation Policy Calculation
          const startTime = show?.startTime ? new Date(show.startTime) : null;
          const hoursUntilShow = startTime
            ? (startTime.getTime() - Date.now()) / (1000 * 60 * 60)
            : 0;
          const canCancel = b.status === "confirmed" && hoursUntilShow >= 2;

          return (
            <div key={b._id} className="booking-card">
              {movie?.posterUrl && (
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="booking-poster"
                />
              )}

              <div className="booking-info">
                <div className="booking-title-row">
                  <div>
                    <h3 className="booking-title">{movie?.title || "Movie Ticket"}</h3>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                      REF: BKG-{b._id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <span className={`status-badge ${b.status}`}>{b.status}</span>
                </div>

                <div className="booking-meta">
                  <p>
                    <strong>{theater?.name}</strong> • {screen?.name} ({theater?.city})
                  </p>
                  <p>
                    {startTime?.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at{" "}
                    <strong style={{ color: "#38bdf8" }}>
                      {startTime?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </strong>
                  </p>
                </div>

                <div className="booking-seats-chips">
                  {seats.map((seat) => (
                    <span key={seat._id} className="seat-chip">
                      Row {seat.row}{seat.number}
                    </span>
                  ))}
                </div>

                <div className="booking-footer">
                  <div>
                    <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#10b981" }}>
                      Total: ₹{b.totalAmount}
                    </span>
                    {b.paymentStatus && (
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginLeft: "0.5rem" }}>
                        ({b.paymentStatus})
                      </span>
                    )}
                  </div>

                  {b.status === "confirmed" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {canCancel ? (
                        <button
                          onClick={() => handleCancelBooking(b._id)}
                          disabled={actionLoading === b._id}
                          className="btn btn-danger"
                          style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
                        >
                          {actionLoading === b._id ? "Cancelling..." : "Cancel Booking"}
                        </button>
                      ) : (
                        <span className="policy-warning">
                          Non-refundable (&lt; 2 hrs to showtime)
                        </span>
                      )}
                    </div>
                  )}

                  {b.status === "pending" && (
                    <Link
                      to={`/checkout/${b._id}`}
                      className="btn btn-primary"
                      style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
                    >
                      Complete Checkout →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
