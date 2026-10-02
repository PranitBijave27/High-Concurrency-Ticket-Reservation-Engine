import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api/client";

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAllMovies = () => {
    setLoading(true);
    setError("");
    API.get("/movies")
      .then((res) => setMovies(res.data.data || []))
      .catch((err) => setError(err.message || "Failed to load movies"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAllMovies();
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchAllMovies();
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/movies/search?title=${encodeURIComponent(query.trim())}`);
      setMovies(res.data.data || []);
    } catch (err) {
      // Backend 404 AppError indicates no matching movies found
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Now Showing</h1>
        <div style={{ display: "flex", gap: "0.5rem", maxWidth: "340px", width: "100%" }}>
          <input
            type="text"
            placeholder="Search movies by title..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ margin: 0, padding: "0.5rem 0.75rem" }}
          />
          {searchQuery && (
            <button onClick={() => handleSearch("")} className="btn btn-secondary">
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Loading movies...</p>
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : movies.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
            No movies found matching "{searchQuery}".
          </p>
          <button onClick={() => handleSearch("")} className="btn btn-secondary">
            Show All Movies
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
