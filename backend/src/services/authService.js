const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  REFRESH_TOKEN_EXPIRY_MS,
} = require("../utils/generateToken");
const AppError = require("../utils/AppError");

exports.registerUser = async (data) => {
  const { name, email, password } = data;

  const existing = await User.findOne({ email });
  if (existing) throw new AppError("User already exists", 409);

  const user = await User.create({ name, email, password });
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token hash in database for rotation & revocation tracking
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    accessToken,
    refreshToken,
    token: accessToken, // backwards compatibility
  };
};

exports.loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) throw new AppError("Invalid credentials", 401);

  const match = await user.comparePassword(password);
  if (!match) throw new AppError("Invalid credentials", 401);

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Persist refresh token hash in MongoDB
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    accessToken,
    refreshToken,
    token: accessToken, // backwards compatibility
  };
};

exports.refreshSession = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new AppError("Refresh token is required", 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch (err) {
    throw new AppError("Invalid or expired refresh token signature", 401);
  }

  // Verify that the refresh token exists in DB by its SHA-256 hash (not revoked/logged out)
  const tokenHash = hashToken(incomingRefreshToken);
  const savedRecord = await RefreshToken.findOne({ tokenHash });
  if (!savedRecord) {
    throw new AppError("Refresh token has been revoked or invalidated", 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    await RefreshToken.deleteOne({ _id: savedRecord._id });
    throw new AppError("User account no longer exists", 401);
  }

  // Rotate Refresh Token: delete the old one and generate a fresh pair
  await RefreshToken.deleteOne({ _id: savedRecord._id });

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(newRefreshToken),
    expiresAt,
  });

  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    token: newAccessToken,
  };
};

exports.logoutUser = async (incomingRefreshToken) => {
  if (incomingRefreshToken) {
    const tokenHash = hashToken(incomingRefreshToken);
    await RefreshToken.deleteOne({ tokenHash });
  }
  return { success: true };
};
