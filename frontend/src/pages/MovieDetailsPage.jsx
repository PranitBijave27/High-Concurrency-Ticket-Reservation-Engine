import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../api/client";

export default function MovieDetailsPage() {
  const { movieId } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      API.get(`/movies/${movieId}`),
      API.get(`/shows/movie/${movieId}`),
    ])
      .then(([movieRes, showsRes]) => {
        setMovie(movieRes.data.data);
        setShows(showsRes.data.data || []);
      })
      .catch((err) => setError(err.message || "Failed to load movie details"))
      .finally(() => setLoading(false));
  }, [movieId]);

  if (loading) return <div className="container"><p>Loading showtimes...</p></div>;
  if (error || !movie) return <div className="container"><div className="alert-error">{error || "Movie not found"}</div></div>;

  return (
    <div className="container">
      <button onClick={() => navigate("/")} className="btn btn-secondary" style={{ marginBottom: "1rem" }}>
        ← Back to Movies
      </button>

      {/* Movie Info Card */}
      <div className="card" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        {movie.posterUrl && (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            style={{ width: "140px", height: "200px", objectFit: "cover", borderRadius: "6px" }}
          />
        )}
        <div style={{ flex: 1, minWidth: "250px" }}>
          <h1 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{movie.title}</h1>
          <p style={{ color: "#94a3b8", marginBottom: "0.5rem" }}>
            {movie.language} • {movie.duration} mins • {movie.genre?.join(", ")}
          </p>
          <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: "1.6" }}>
            {movie.description}
          </p>
        </div>
      </div>

      {/* Showtimes Section */}
      <h2 style={{ fontSize: "1.3rem", margin: "1.5rem 0 1rem" }}>Available Showtimes</h2>

      {shows.length === 0 ? (
        <div className="card">
          <p style={{ color: "#94a3b8" }}>No scheduled shows currently available for this movie.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {shows.map((show) => {
            const theater = show.screenId?.theaterId;
            const startTime = new Date(show.startTime);
            const formattedDate = startTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
            const formattedTime = startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <div key={show._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.05rem" }}>
                    {theater?.name || "Cinema Hall"} — {show.screenId?.name}
                  </h3>
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                    {formattedDate} at <strong style={{ color: "#38bdf8" }}>{formattedTime}</strong>
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#10b981" }}>
                    From ₹{show.basePrice}
                  </span>
                  <Link to={`/shows/${show._id}/seats`} className="btn btn-primary">
                    Select Seats →
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
