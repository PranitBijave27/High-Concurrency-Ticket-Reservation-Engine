import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api/client";

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/movies")
      .then((res) => setMovies(res.data.data || []))
      .catch((err) => setError(err.message || "Failed to load movies"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="container"><p>Loading movies...</p></div>;
  }

  if (error) {
    return <div className="container"><div className="alert-error">{error}</div></div>;
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1.25rem" }}>Now Showing</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "2.5rem",
        }}
      >
        {movies.map((movie) => (
          <div key={movie._id} className="card" style={{ display: "flex", flexDirection: "column" }}>
            {movie.posterUrl && (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                style={{
                  width: "100%",
                  height: "280px",
                  objectFit: "cover",
                  borderRadius: "6px",
                  marginBottom: "0.75rem",
                }}
              />
            )}
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{movie.title}</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              {movie.language} • {movie.duration} mins
            </p>
            <p style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "1rem", flex: 1 }}>
              {movie.genre?.join(", ")}
            </p>
            <Link to={`/movies/${movie._id}`} className="btn btn-primary" style={{ width: "100%" }}>
              Select Showtime
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
