import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <Link to="/" className="nav-brand">
        🎬 MovieReserve
      </Link>

      <nav className="nav-links">
        <Link to="/" style={{ color: "#cbd5e1", fontWeight: "500" }}>
          Movies
        </Link>

        {isAuthenticated ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
              Hi, <strong>{user?.name}</strong>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link to="/login" className="btn btn-secondary">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
