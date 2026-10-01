const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes short-lived
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days long-lived
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET + "_refresh");

const crypto = require("crypto");

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
      jti: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
    },
    getRefreshSecret(),
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    }
  );
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRefreshSecret());
};

// Default export generates access token for backwards compatibility
module.exports = generateAccessToken;
module.exports.generateAccessToken = generateAccessToken;
module.exports.generateRefreshToken = generateRefreshToken;
module.exports.verifyRefreshToken = verifyRefreshToken;
module.exports.REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_MS;
