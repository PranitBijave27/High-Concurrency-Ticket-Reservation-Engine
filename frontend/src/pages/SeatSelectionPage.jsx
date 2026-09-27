import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import API from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function SeatSelectionPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState(
    location.state?.selectedSeatIds || []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [showId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [showRes, seatsRes] = await Promise.all([
        API.get(`/shows/${showId}`),
        API.get(`/bookings/show/${showId}/availability`),
      ]);
      setShow(showRes.data.data);
      setSeats(seatsRes.data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load seat availability.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle seat selection
  const toggleSeat = (seat) => {
    if (seat.isBooked || seat.status === "locked" || seat.status === "booked") {
      return;
    }

    if (selectedSeatIds.includes(seat._id)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat._id));
    } else {
      if (selectedSeatIds.length >= 10) {
        setError("Maximum 10 seats allowed per booking.");
        return;
      }
      setError("");
      setSelectedSeatIds((prev) => [...prev, seat._id]);
    }
  };

  // Group seats by row
  const rowsMap = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});

  const sortedRows = Object.keys(rowsMap).sort();

  // Price calculation
  const calculateTotal = () => {
    if (!show || selectedSeatIds.length === 0) return 0;
    const basePrice = show.basePrice || 200;

    const sum = selectedSeatIds.reduce((total, id) => {
      const seat = seats.find((s) => s._id === id);
      if (!seat) return total;
      let multiplier = 1;
      if (seat.type === "premium") multiplier = 1.45;
      if (seat.type === "vip") multiplier = 1.75;
      return total + basePrice * multiplier;
    }, 0);

    return Math.ceil(sum);
  };

  // Hold seats & proceed to checkout
  const handleHoldSeats = async () => {
    if (selectedSeatIds.length === 0) return;

    if (!isAuthenticated) {
      // Delayed login pattern: bounce to login while keeping selected seats
      navigate("/login", { state: { from: location, selectedSeatIds } });
      return;
    }

    try {
      setHolding(true);
      setError("");

      // POST /api/bookings creates 5-minute atomic lock in MongoDB
      const res = await API.post("/bookings", {
        showId,
        seatIds: selectedSeatIds,
      });

      navigate(`/checkout/${res.data.data._id}`, { state: { booking: res.data.data } });
    } catch (err) {
      setError(err.message || "Failed to hold seats. Someone may have just reserved them.");
      fetchData(); // refresh availability
    } finally {
      setHolding(false);
    }
  };

  if (loading) return <div className="container"><p>Loading seat map...</p></div>;
  if (!show) return <div className="container"><div className="alert-error">Show not found</div></div>;

  const totalAmount = calculateTotal();
  const selectedSeatsList = seats.filter((s) => selectedSeatIds.includes(s._id));

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: "1rem" }}>
        ← Back
      </button>

      {/* Show Header */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.3rem" }}>{show.movieId?.title}</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
          {show.screenId?.theaterId?.name} ({show.screenId?.name}) • Base Price: ₹{show.basePrice}
        </p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Screen Indicator */}
      <div
        style={{
          textAlign: "center",
          padding: "0.5rem",
          background: "#1e293b",
          borderRadius: "6px",
          color: "#94a3b8",
          fontSize: "0.85rem",
          letterSpacing: "2px",
          marginBottom: "1.5rem",
        }}
      >
        --- SCREEN ---
      </div>

      {/* Seat Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", marginBottom: "2rem" }}>
        {sortedRows.map((rowKey) => (
          <div key={rowKey} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: "20px", fontWeight: "700", color: "#64748b", fontSize: "0.85rem" }}>
              {rowKey}
            </span>
            {rowsMap[rowKey].map((seat) => {
              const isSelected = selectedSeatIds.includes(seat._id);
              const isBooked = seat.isBooked || seat.status === "booked" || seat.status === "locked";

              let seatClass = `available ${seat.type || "regular"}`;
              if (isBooked) seatClass = "booked";
              if (isSelected) seatClass = "selected";

              return (
                <button
                  key={seat._id}
                  disabled={isBooked}
                  className={`seat-btn ${seatClass}`}
                  onClick={() => toggleSeat(seat)}
                  title={`Row ${seat.row}${seat.number} (${seat.type} tier)`}
                >
                  {seat.number}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Seat Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="seat-btn available regular" style={{ width: "16px", height: "16px" }}></span> Regular
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="seat-btn available premium" style={{ width: "16px", height: "16px" }}></span> Premium
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="seat-btn available vip" style={{ width: "16px", height: "16px" }}></span> VIP
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="seat-btn selected" style={{ width: "16px", height: "16px" }}></span> Selected
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="seat-btn booked" style={{ width: "16px", height: "16px" }}></span> Booked
        </div>
      </div>

      {/* Checkout Summary Card */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
            Selected Seats ({selectedSeatIds.length}):{" "}
            <strong style={{ color: "#f8fafc" }}>
              {selectedSeatsList.map((s) => `${s.row}${s.number}`).join(", ") || "None"}
            </strong>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#10b981", marginTop: "0.2rem" }}>
            Total: ₹{totalAmount}
          </div>
        </div>

        <button
          onClick={handleHoldSeats}
          disabled={selectedSeatIds.length === 0 || holding}
          className="btn btn-primary"
          style={{ padding: "0.75rem 1.5rem", fontSize: "1rem" }}
        >
          {holding ? "Holding Seats..." : `Hold Seats & Checkout (₹${totalAmount})`}
        </button>
      </div>
    </div>
  );
}
