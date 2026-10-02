import axios from "axios";

// In-memory access token storage (protected against XSS theft)
let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => inMemoryAccessToken;

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true, // Send and receive HTTP-Only cookies cross-origin
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Automatically inject in-memory JWT bearer token
API.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Shared promise to deduplicate concurrent refresh calls (avoids token rotation race conditions)
let refreshPromise = null;

// Response Interceptor: Handle transparent 401 silent token refresh & retry
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized for regular API endpoints (exclude auth endpoints to prevent loops)
    const isAuthRoute = originalRequest?.url?.includes("/auth/");
    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = API.post("/auth/refresh")
            .then((res) => {
              const newToken = res.data?.data?.accessToken;
              setAccessToken(newToken);
              window.dispatchEvent(
                new CustomEvent("auth:refreshed", {
                  detail: { accessToken: newToken, user: res.data?.data?.user },
                })
              );
              return newToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshErr) {
        setAccessToken(null);
        window.dispatchEvent(new Event("auth:expired"));
        return Promise.reject(refreshErr);
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred.";
    return Promise.reject(new Error(message));
  }
);

export default API;
