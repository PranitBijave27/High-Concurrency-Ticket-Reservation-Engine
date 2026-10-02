import React, { createContext, useContext, useState, useEffect } from "react";
import API, { setAccessToken } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Silent session rehydration from HTTP-Only cookie on initial app mount
  useEffect(() => {
    let isMounted = true;

    const rehydrateSession = async () => {
      try {
        const res = await API.post("/auth/refresh");
        const { accessToken, user: userData } = res.data.data;
        if (isMounted) {
          setAccessToken(accessToken);
          setToken(accessToken);
          setUser(userData);
        }
      } catch (err) {
        // No active session or refresh cookie expired - remain guest
        if (isMounted) {
          setAccessToken(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    rehydrateSession();

    // Listen for background session updates or expirations dispatched from client.js
    const handleAuthRefreshed = (e) => {
      if (isMounted && e.detail) {
        setToken(e.detail.accessToken);
        if (e.detail.user) setUser(e.detail.user);
      }
    };

    const handleAuthExpired = () => {
      if (isMounted) {
        setToken(null);
        setUser(null);
      }
    };

    window.addEventListener("auth:refreshed", handleAuthRefreshed);
    window.addEventListener("auth:expired", handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener("auth:refreshed", handleAuthRefreshed);
      window.removeEventListener("auth:expired", handleAuthExpired);
    };
  }, []);

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    const { accessToken, user: receivedUser } = res.data.data;

    setAccessToken(accessToken);
    setToken(accessToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (name, email, password) => {
    const res = await API.post("/auth/register", { name, email, password });
    const { accessToken, user: receivedUser } = res.data.data;

    setAccessToken(accessToken);
    setToken(accessToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {
      console.warn("Server logout notification failed:", err.message);
    } finally {
      setAccessToken(null);
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
