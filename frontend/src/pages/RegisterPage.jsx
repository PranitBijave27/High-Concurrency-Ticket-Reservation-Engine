import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: "420px", marginTop: "2rem" }}>
      <div className="card">
        <h2 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>Register</h2>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          Create an account to book and manage movie tickets
        </p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", color: "#cbd5e1" }}>
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
          />

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
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#94a3b8" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#38bdf8", fontWeight: "600" }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
