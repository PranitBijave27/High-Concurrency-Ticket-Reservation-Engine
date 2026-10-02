import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Film, Building2 } from "lucide-react";
import API from "../api/client";

export default function TheatersPage() {
  const [theaters, setTheaters] = useState([]);
  const [selectedTheater, setSelectedTheater] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/theaters")
      .then((res) => setTheaters(res.data.data || []))
      .catch((err) => setError(err.message || "Failed to load theaters"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectTheater = async (id) => {
    if (selectedTheater?._id === id) {
      setSelectedTheater(null);
      return;
    }

    try {
      setDetailLoading(true);
      const res = await API.get(`/theaters/${id}`);
      setSelectedTheater(res.data.data);
    } catch (err) {
      console.error("Failed to load theater details:", err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading theaters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Partner Theaters</h1>
      <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Browse available cinema venues, screens, and multiplex locations
      </p>

      {theaters.length === 0 ? (
        <div className="card">
          <p style={{ color: "#94a3b8" }}>No active theaters found.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {theaters.map((theater) => {
            const isSelected = selectedTheater?._id === theater._id;
            return (
              <div
                key={theater._id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  borderColor: isSelected ? "#38bdf8" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Building2 size={20} color="#38bdf8" />
                  <h3 style={{ fontSize: "1.2rem", margin: 0 }}>{theater.name}</h3>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                  <MapPin size={16} />
                  <span>
                    {theater.address ? `${theater.address}, ` : ""}
                    <strong>{theater.city}</strong>
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.85rem" }}>
                  <Film size={16} />
                  <span>{theater.screensCount || 1} Audi Screens</span>
                </div>

                {isSelected && (
                  <div style={{ background: "#0f172a", padding: "0.75rem", borderRadius: "6px", marginTop: "0.5rem" }}>
                    <p style={{ fontSize: "0.8rem", color: "#cbd5e1", margin: "0 0 0.25rem" }}>
                      Venue ID: <code style={{ color: "#38bdf8" }}>{theater._id}</code>
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "#10b981", margin: 0 }}>
                      Status: Active Multiplex
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", paddingTop: "0.5rem" }}>
                  <button
                    onClick={() => handleSelectTheater(theater._id)}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: "0.85rem" }}
                  >
                    {detailLoading && isSelected ? "Loading..." : isSelected ? "Hide Info" : "Theater Info"}
                  </button>
                  <Link to="/" className="btn btn-primary" style={{ flex: 1, fontSize: "0.85rem", textAlign: "center" }}>
                    View Movies
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
