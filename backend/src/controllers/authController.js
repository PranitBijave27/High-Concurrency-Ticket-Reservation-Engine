const authService = require("../services/authService");
const wrapAsync = require("../utils/wrapAsync");

const COOKIE_NAME = "refreshToken";

// Security cookie options: httpOnly blocks XSS, sameSite blocks CSRF
// For cross-site cloud deployment (e.g. Vercel frontend + Render backend), sameSite must be "none" with secure: true
// In local development or single-domain setups, sameSite defaults to "strict"
const isProduction = process.env.NODE_ENV === "production";
const cookieSameSite = process.env.COOKIE_SAMESITE || (isProduction ? "none" : "strict");

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction || cookieSameSite === "none",
  sameSite: cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/auth",
});

const setRefreshCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie(COOKIE_NAME, getCookieOptions());
};

exports.register = wrapAsync(async (req, res, next) => {
  const result = await authService.registerUser(req.body);
  setRefreshCookie(res, result.refreshToken);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: result.user,
      accessToken: result.accessToken,
      token: result.token, // backwards compatibility
    },
  });
});

exports.login = wrapAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  setRefreshCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: result.user,
      accessToken: result.accessToken,
      token: result.token, // backwards compatibility
    },
  });
});

exports.refreshToken = wrapAsync(async (req, res, next) => {
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await authService.refreshSession(incomingToken);
  setRefreshCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: {
      user: result.user,
      accessToken: result.accessToken,
      token: result.token,
    },
  });
});

exports.logout = wrapAsync(async (req, res, next) => {
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logoutUser(incomingToken);
  clearRefreshCookie(res);

  res.status(200).json({
    success: true,
    message: "Logged out successfully and session revoked",
  });
});
