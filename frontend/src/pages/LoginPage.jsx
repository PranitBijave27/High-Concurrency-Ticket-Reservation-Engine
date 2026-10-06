import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/";
  const selectedSeatIds = location.state?.selectedSeatIds;

  // If already logged in, redirect immediately (admins to /admin, others to home/from)
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (!location.state?.from) {
        navigate("/", { replace: true });
      }
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loggedUser = await login(email, password);

      // Requirement: Admin automatically routes to /admin!
      if (loggedUser?.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      // If customer came from selecting seats, navigate back preserving seats
      if (location.state?.from) {
        navigate(location.state.from.pathname, {
          state: { selectedSeatIds },
          replace: true,
        });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: "420px", marginTop: "2rem" }}>
      <div className="card">
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>Login</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          Sign in to complete your seat reservation
        </p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", color: "#cbd5e1" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", color: "#cbd5e1" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#94a3b8" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#38bdf8", fontWeight: "600" }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
