import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Check } from "lucide-react";
import API from "../api/client";
import "./GeminiRecommender.css";

export default function GeminiSeatRecommender({ showId, onSelectRecommendedSeats }) {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(2);
  const [type, setType] = useState("any");
  const [request, setRequest] = useState("center viewing angle");
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState("");

  const handleGetRecommendation = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setRecommendation(null);

      const res = await API.get(`/shows/${showId}/recommend-seats`, {
        params: { count, type, request },
      });

      const data = res.data.data;
      setRecommendation(data);

      // Auto-apply recommended seat IDs
      if (data?.recommendedSeats?.length > 0 && onSelectRecommendedSeats) {
        const ids = data.recommendedSeats.map((s) => s.id);
        onSelectRecommendedSeats(ids);
      }
    } catch (err) {
      setError(err.message || "Failed to generate AI seat recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-recommender-card">
      <div className="ai-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="ai-title">
          <Sparkles size={18} color="#38bdf8" />
          <span>Smart Seat Recommender</span>
          <span className="ai-badge">MovieMate</span>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isOpen && (
        <div>
          <form onSubmit={handleGetRecommendation} style={{ marginTop: "0.75rem" }}>
            <div className="ai-form-grid">
              <div className="ai-field">
                <label className="ai-label">Number of Seats</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="ai-select"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? "Seat" : "Seats"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ai-field">
                <label className="ai-label">Preferred Tier</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="ai-select"
                >
                  <option value="any">Any Available Tier</option>
                  <option value="regular">Regular</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              <div className="ai-field" style={{ gridColumn: "span 2" }}>
                <label className="ai-label">Preference Note</label>
                <input
                  type="text"
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder="e.g. center row, aisle seats, best audio"
                  className="ai-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                marginTop: "1rem",
                padding: "0.55rem",
                fontSize: "0.9rem",
              }}
            >
              <Sparkles size={16} />
              <span>{loading ? "Asking MovieMate AI..." : "Get AI Recommendation"}</span>
            </button>
          </form>

          {error && (
            <div className="alert-error" style={{ marginTop: "0.75rem" }}>
              {error}
            </div>
          )}

          {recommendation && (
            <div className="ai-reason-box">
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                <Check size={16} color="#10b981" />
                <strong style={{ fontSize: "0.85rem", color: "#10b981" }}>
                  Seats Auto-Selected on Map!
                </strong>
              </div>

              <div className="ai-seats-chips">
                {recommendation.recommendedSeats?.map((s) => (
                  <span key={s.id} className="ai-seat-chip">
                    Row {s.row}-{s.number} ({s.type} • ₹{s.price})
                  </span>
                ))}
              </div>

              <p className="ai-reason-text">"{recommendation.reason}"</p>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Estimated Total: <strong style={{ color: "#f8fafc" }}>₹{recommendation.totalPrice}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
