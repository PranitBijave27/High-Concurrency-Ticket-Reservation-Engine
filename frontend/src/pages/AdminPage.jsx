import React, { useState, useEffect } from "react";
import { PlusCircle, Archive, Calendar, Film, CheckCircle2, AlertCircle, Tv, Trash2 } from "lucide-react";
import API from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./AdminPage.css";

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("movies");

  // Movies State
  const [movies, setMovies] = useState([]);
  const [movieForm, setMovieForm] = useState({
    title: "",
    description: "",
    duration: 120,
    genre: "Action",
    language: "english",
    releaseDate: new Date().toISOString().split("T")[0],
    posterUrl: "",
  });
  const [movieLoading, setMovieLoading] = useState(false);
  const [movieError, setMovieError] = useState("");
  const [movieSuccess, setMovieSuccess] = useState("");

  // Shows State
  const [screens, setScreens] = useState([]);
  const [showForm, setShowForm] = useState({
    movieId: "",
    screenId: "",
    startTime: "",
    basePrice: 250,
  });
  const [showLoading, setShowLoading] = useState(false);
  const [showError, setShowError] = useState("");
  const [showSuccess, setShowSuccess] = useState("");

  // Screens State
  const [screenForm, setScreenForm] = useState({
    name: "",
    layoutType: "standard",
    seatsPerRow: 10,
    rows: [
      { name: "A", type: "regular" },
      { name: "B", type: "regular" },
      { name: "C", type: "premium" },
      { name: "D", type: "vip" },
    ],
  });
  const [screenLoading, setScreenLoading] = useState(false);
  const [screenError, setScreenError] = useState("");
  const [screenSuccess, setScreenSuccess] = useState("");

  useEffect(() => {
    fetchMovies();
    fetchScreens();
  }, []);

  const fetchMovies = async () => {
    try {
      const res = await API.get("/movies");
      setMovies(res.data.data || []);
      if (res.data.data?.length > 0 && !showForm.movieId) {
        setShowForm((prev) => ({ ...prev, movieId: res.data.data[0]._id }));
      }
    } catch (err) {
      console.error("Failed to load movies:", err.message);
    }
  };

  const fetchScreens = async () => {
    try {
      const res = await API.get("/screens");
      setScreens(res.data.data || []);
      if (res.data.data?.length > 0 && !showForm.screenId) {
        setShowForm((prev) => ({ ...prev, screenId: res.data.data[0]._id }));
      }
    } catch (err) {
      console.error("Failed to load screens:", err.message);
    }
  };

  // Add Movie (POST /api/movies)
  const handleAddMovie = async (e) => {
    e.preventDefault();
    setMovieError("");
    setMovieSuccess("");
    setMovieLoading(true);

    try {
      const genresArray = movieForm.genre.split(",").map((g) => g.trim()).filter(Boolean);
      await API.post("/movies", {
        ...movieForm,
        duration: Number(movieForm.duration),
        genre: genresArray,
        status: "active",
      });

      setMovieSuccess(`✓ Movie "${movieForm.title}" added to active catalog!`);
      setMovieForm({
        title: "",
        description: "",
        duration: 120,
        genre: "Action",
        language: "english",
        releaseDate: new Date().toISOString().split("T")[0],
        posterUrl: "",
      });
      fetchMovies();
    } catch (err) {
      setMovieError(err.message || "Failed to create movie.");
    } finally {
      setMovieLoading(false);
    }
  };

  // Archive Movie (PATCH /api/movies/:id/archive)
  const handleArchiveMovie = async (movieId, title) => {
    if (!window.confirm(`Archive "${title}"? It will no longer appear in the customer catalog.`)) {
      return;
    }

    try {
      await API.patch(`/movies/${movieId}/archive`);
      setMovieSuccess(`✓ Movie "${title}" archived.`);
      fetchMovies();
    } catch (err) {
      setMovieError(err.message || "Failed to archive movie.");
    }
  };

  // Schedule Show (POST /api/shows)
  const handleScheduleShow = async (e) => {
    e.preventDefault();
    setShowError("");
    setShowSuccess("");
    setShowLoading(true);

    try {
      if (!showForm.movieId || !showForm.screenId || !showForm.startTime) {
        throw new Error("Please select Movie, Screen, and valid Start Time.");
      }

      const isoStartTime = new Date(showForm.startTime).toISOString();

      await API.post("/shows", {
        movieId: showForm.movieId,
        screenId: showForm.screenId,
        startTime: isoStartTime,
        basePrice: Number(showForm.basePrice),
      });

      setShowSuccess("✓ Showtime scheduled successfully with collision avoidance verified!");
      setShowForm((prev) => ({ ...prev, startTime: "" }));
    } catch (err) {
      setShowError(err.message || "Failed to schedule show.");
    } finally {
      setShowLoading(false);
    }
  };

  // Screen Management Handlers
  const handleAddRow = () => {
    const nextChar = String.fromCharCode(65 + screenForm.rows.length);
    setScreenForm((prev) => ({
      ...prev,
      rows: [...prev.rows, { name: nextChar, type: "regular" }],
    }));
  };

  const handleRemoveRow = (index) => {
    if (screenForm.rows.length <= 1) return;
    setScreenForm((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index),
    }));
  };

  const handleRowTypeChange = (index, type) => {
    setScreenForm((prev) => {
      const updated = [...prev.rows];
      updated[index] = { ...updated[index], type };
      return { ...prev, rows: updated };
    });
  };

  const handleRowNameChange = (index, name) => {
    setScreenForm((prev) => {
      const updated = [...prev.rows];
      updated[index] = { ...updated[index], name: name.toUpperCase() };
      return { ...prev, rows: updated };
    });
  };

  // Create Screen (POST /api/screens)
  const handleCreateScreen = async (e) => {
    e.preventDefault();
    setScreenError("");
    setScreenSuccess("");
    setScreenLoading(true);

    try {
      if (!screenForm.name.trim()) throw new Error("Screen name is required.");
      if (screenForm.rows.length === 0) throw new Error("At least one row is required.");

      const payload = {
        name: screenForm.name.trim(),
        layoutType: screenForm.layoutType,
        seatsPerRow: Number(screenForm.seatsPerRow),
        rows: screenForm.rows.map((r) => ({
          name: r.name.trim().toUpperCase(),
          type: r.type,
        })),
      };

      await API.post("/screens", payload);
      const totalSeats = payload.rows.length * payload.seatsPerRow;
      setScreenSuccess(`✓ Screen "${payload.name}" successfully created with ${totalSeats} physical seats!`);
      setScreenForm({
        name: "",
        layoutType: "standard",
        seatsPerRow: 10,
        rows: [
          { name: "A", type: "regular" },
          { name: "B", type: "regular" },
          { name: "C", type: "premium" },
          { name: "D", type: "vip" },
        ],
      });
      fetchScreens();
    } catch (err) {
      setScreenError(err.message || "Failed to create screen.");
    } finally {
      setScreenLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 style={{ fontSize: "1.6rem", margin: "0 0 0.25rem" }}>Admin Back-Office Portal</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
            Manage movie catalog, soft deletions, and schedule auditorium showtimes
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="admin-badge">Role: {user?.role || "Admin"}</span>
          <span style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>({user?.email})</span>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="admin-tabs">
        <button
          onClick={() => setActiveTab("movies")}
          className={`admin-tab ${activeTab === "movies" ? "active" : ""}`}
        >
          <Film size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.35rem" }} />
          Movie Management
        </button>
        <button
          onClick={() => setActiveTab("shows")}
          className={`admin-tab ${activeTab === "shows" ? "active" : ""}`}
        >
          <Calendar size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.35rem" }} />
          Schedule Showtimes
        </button>
        <button
          onClick={() => setActiveTab("screens")}
          className={`admin-tab ${activeTab === "screens" ? "active" : ""}`}
        >
          <Tv size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.35rem" }} />
          Create Screen
        </button>
      </div>

      {/* TAB 1: MOVIES */}
      {activeTab === "movies" && (
        <div>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Add New Movie to Catalog</h2>

            {movieSuccess && <div className="alert-success" style={{ marginBottom: "1rem" }}>{movieSuccess}</div>}
            {movieError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{movieError}</div>}

            <form onSubmit={handleAddMovie} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label>Movie Title *</label>
                  <input
                    type="text"
                    required
                    value={movieForm.title}
                    onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                    placeholder="e.g. Oppenheimer"
                  />
                </div>

                <div className="admin-field">
                  <label>Duration (Minutes) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="600"
                    value={movieForm.duration}
                    onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })}
                  />
                </div>

                <div className="admin-field">
                  <label>Genre(s) (valid: Action, Comedy, Drama, Horror, Romance, Thriller, Sci-Fi) *</label>
                  <input
                    type="text"
                    required
                    value={movieForm.genre}
                    onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
                    placeholder="e.g. Drama, Thriller"
                  />
                </div>

                <div className="admin-field">
                  <label>Language *</label>
                  <input
                    type="text"
                    required
                    value={movieForm.language}
                    onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                    placeholder="e.g. english, hindi"
                  />
                </div>

                <div className="admin-field">
                  <label>Release Date *</label>
                  <input
                    type="date"
                    required
                    value={movieForm.releaseDate}
                    onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })}
                  />
                </div>

                <div className="admin-field">
                  <label>Poster URL (Optional)</label>
                  <input
                    type="url"
                    value={movieForm.posterUrl}
                    onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
                    placeholder="https://example.com/poster.jpg"
                  />
                </div>
              </div>

              <div className="admin-field">
                <label>Description *</label>
                <textarea
                  required
                  rows="3"
                  value={movieForm.description}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  placeholder="Synopsis of the movie..."
                />
              </div>

              <button
                type="submit"
                disabled={movieLoading}
                className="btn btn-primary"
                style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
              >
                {movieLoading ? "Saving Movie..." : "Add Movie (POST /api/movies)"}
              </button>
            </form>
          </div>

          {/* Active Movies List with Archive Action */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Active Catalog ({movies.length})</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Soft-delete a movie using <code>PATCH /api/movies/:id/archive</code>. It retains booking history while removing from public listings.
            </p>

            <div className="admin-movie-list">
              {movies.map((m) => (
                <div key={m._id} className="admin-movie-item">
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <h4 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }}>{m.title}</h4>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem" }}>
                      {m.language} • {m.duration} mins • {m.genre?.join(", ")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleArchiveMovie(m._id, m.title)}
                    className="btn-danger"
                    title="Soft-delete movie from customer catalog"
                  >
                    Archive
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE SHOWS */}
      {activeTab === "shows" && (
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Schedule New Show</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Create a showtime via <code>POST /api/shows</code>. The backend enforces a 20-minute cleaning buffer and rejects overlapping showtimes.
          </p>

          {showSuccess && <div className="alert-success" style={{ marginBottom: "1rem" }}>{showSuccess}</div>}
          {showError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{showError}</div>}

          <form onSubmit={handleScheduleShow} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Select Movie *</label>
                <select
                  required
                  value={showForm.movieId}
                  onChange={(e) => setShowForm({ ...showForm, movieId: e.target.value })}
                >
                  {movies.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.title} ({m.duration}m)
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label>Select Screen *</label>
                <select
                  required
                  value={showForm.screenId}
                  onChange={(e) => setShowForm({ ...showForm, screenId: e.target.value })}
                >
                  {screens.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.totalSeats || 0} seats) • {s.layoutType ? s.layoutType.toUpperCase() : "STANDARD"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label>Start Date & Time (Must be in the future) *</label>
                <input
                  type="datetime-local"
                  required
                  value={showForm.startTime}
                  onChange={(e) => setShowForm({ ...showForm, startTime: e.target.value })}
                />
              </div>

              <div className="admin-field">
                <label>Base Ticket Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10000"
                  value={showForm.basePrice}
                  onChange={(e) => setShowForm({ ...showForm, basePrice: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={showLoading}
              className="btn btn-primary"
              style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
            >
              {showLoading ? "Scheduling..." : "Schedule Showtime (POST /api/shows)"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: CREATE SCREEN */}
      {activeTab === "screens" && (
        <div>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Create New Auditorium / Screen</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Configure a physical screen for this cinema with automated tiered seat generation via <code>POST /api/screens</code>.
            </p>

            {screenSuccess && <div className="alert-success" style={{ marginBottom: "1rem" }}>{screenSuccess}</div>}
            {screenError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{screenError}</div>}

            <form onSubmit={handleCreateScreen} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label>Screen / Auditorium Name *</label>
                  <input
                    type="text"
                    required
                    value={screenForm.name}
                    onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })}
                    placeholder="e.g. Screen 2 - Dolby Atmos"
                  />
                </div>

                <div className="admin-field">
                  <label>Layout Type *</label>
                  <select
                    required
                    value={screenForm.layoutType}
                    onChange={(e) => setScreenForm({ ...screenForm, layoutType: e.target.value })}
                  >
                    <option value="standard">Standard</option>
                    <option value="classic">Classic</option>
                    <option value="imax">IMAX</option>
                    <option value="4dx">4DX</option>
                  </select>
                </div>

                <div className="admin-field">
                  <label>Seats Per Row (1 - 50) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="50"
                    value={screenForm.seatsPerRow}
                    onChange={(e) => setScreenForm({ ...screenForm, seatsPerRow: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                </div>

                <div className="admin-field" style={{ justifyContent: "center" }}>
                  <label>Total Seating Capacity</label>
                  <div style={{ marginTop: "0.25rem" }}>
                    <span className="capacity-pill">
                      {screenForm.rows.length * screenForm.seatsPerRow} Total Seats ({screenForm.rows.length} rows × {screenForm.seatsPerRow} seats)
                    </span>
                  </div>
                </div>
              </div>

              {/* Row Tiers Configuration */}
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.9rem", color: "#cbd5e1", fontWeight: "600" }}>
                    Seating Rows & Tier Configuration ({screenForm.rows.length} rows)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.65rem" }}
                  >
                    + Add Row
                  </button>
                </div>

                <div className="row-config-list">
                  {screenForm.rows.map((row, idx) => (
                    <div key={idx} className="row-config-item">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: "120px" }}>
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Row:</span>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          value={row.name}
                          onChange={(e) => handleRowNameChange(idx, e.target.value)}
                          style={{ width: "50px", textAlign: "center", textTransform: "uppercase", padding: "0.3rem", fontWeight: "700" }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Tier:</span>
                        <select
                          value={row.type}
                          onChange={(e) => handleRowTypeChange(idx, e.target.value)}
                          style={{ padding: "0.35rem 0.5rem", flex: 1, maxWidth: "200px" }}
                        >
                          <option value="regular">Regular (Standard)</option>
                          <option value="premium">Premium (Middle)</option>
                          <option value="vip">VIP (Balcony / Recliner)</option>
                        </select>
                      </div>

                      <span style={{ color: "#64748b", fontSize: "0.8rem", minWidth: "90px" }}>
                        {screenForm.seatsPerRow} seats
                      </span>

                      {screenForm.rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="btn-danger"
                          style={{ padding: "0.3rem 0.5rem" }}
                          title="Remove row"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={screenLoading}
                className="btn btn-primary"
                style={{ alignSelf: "flex-start", marginTop: "1rem" }}
              >
                {screenLoading ? "Creating Screen & Seats..." : "Create Screen (POST /api/screens)"}
              </button>
            </form>
          </div>

          {/* Existing Screens List */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Cinema Screens ({screens.length})</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Active auditoriums configured for this cinema multiplex.
            </p>

            <div className="admin-movie-list">
              {screens.map((s) => (
                <div key={s._id} className="admin-movie-item">
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }}>{s.name}</h4>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem" }}>
                      Capacity: <strong style={{ color: "#38bdf8" }}>{s.totalSeats || 0} seats</strong> • Layout: <strong style={{ color: "#a855f7" }}>{s.layoutType?.toUpperCase() || "STANDARD"}</strong> • Status: <strong style={{ color: "#10b981" }}>{s.status}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
