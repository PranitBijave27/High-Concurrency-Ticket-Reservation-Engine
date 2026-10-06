import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ padding: "3rem 1rem", textAlign: "center" }}>
        <p style={{ color: "#94a3b8" }}>Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    // Non-admins or unauthenticated users are bounced to customer home
    return <Navigate to="/" replace />;
  }

  return children;
}
