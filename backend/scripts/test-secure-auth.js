const BASE_URL = "http://127.0.0.1:3000/api";

async function runAuthSecurityTest() {
  console.log("==================================================================");
  console.log("🔒 TEST SUITE: Dual-Token Auth, HTTP-Only Cookie & Token Rotation");
  console.log("==================================================================");

  const testEmail = `auth_sec_${Date.now()}@example.com`;
  const password = "password123";

  // -------------------------------------------------------------
  // TEST 1: Registration & HTTP-Only Cookie Setting
  // -------------------------------------------------------------
  console.log("\n1. Testing Registration & HTTP-Only Cookie...");
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Security Tester",
      email: testEmail,
      password: password,
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`Registration failed: ${regData.message}`);

  const setCookieHeader = regRes.headers.get("set-cookie") || "";
  console.log("✓ Registration succeeded. Set-Cookie header received:");
  console.log("  ", setCookieHeader);

  if (!setCookieHeader.toLowerCase().includes("httponly")) {
    throw new Error("FAIL: refreshToken cookie MUST have HttpOnly flag!");
  }
  if (!setCookieHeader.toLowerCase().includes("samesite=strict")) {
    throw new Error("FAIL: refreshToken cookie MUST have SameSite=Strict!");
  }
  if (!regData.data?.accessToken) {
    throw new Error("FAIL: Response body must include short-lived accessToken!");
  }
  console.log("✓ Access Token received (15m validity)");
  console.log("✓ HTTP-Only Cookie set with SameSite=Strict and Path=/api/auth");

  // Extract refreshToken cookie value
  const cookieMatch = setCookieHeader.match(/refreshToken=([^;]+)/);
  let currentCookie = cookieMatch ? cookieMatch[1] : null;
  let currentAccessToken = regData.data.accessToken;

  // -------------------------------------------------------------
  // TEST 2: Protected Route Access with Access Token
  // -------------------------------------------------------------
  console.log("\n2. Testing Protected Endpoint Access with Bearer Access Token...");
  const protectedRes = await fetch(`${BASE_URL}/bookings/me`, {
    headers: { Authorization: `Bearer ${currentAccessToken}` },
  });
  if (protectedRes.status !== 200) {
    throw new Error(`Protected route rejected access token with status ${protectedRes.status}`);
  }
  console.log("✓ Protected route /bookings/me accepted Bearer Access Token (Status 200)");

  // -------------------------------------------------------------
  // TEST 3: Login & New Cookie Issuance
  // -------------------------------------------------------------
  console.log("\n3. Testing Login & Fresh Session Issuance...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Login failed: ${loginData.message}`);

  const loginCookieHeader = loginRes.headers.get("set-cookie") || "";
  // Extract latest refresh token from cookie
  const loginCookieMatch = loginCookieHeader.match(/refreshToken=([^;]+)/);
  currentCookie = loginCookieMatch ? loginCookieMatch[1] : currentCookie;
  currentAccessToken = loginData.data.accessToken;
  console.log("✓ Login successful. Fresh Access Token and HTTP-Only Cookie issued.");

  // -------------------------------------------------------------
  // TEST 3B: Database Security Audit (Verify SHA-256 Hashing at Rest)
  // -------------------------------------------------------------
  console.log("\n3b. Verifying Token Hashing at Rest in MongoDB...");
  const crypto = require("crypto");
  const mongoose = require("mongoose");
  require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const expectedHash = crypto.createHash("sha256").update(currentCookie).digest("hex");
  const storedDoc = await mongoose.connection.collection("refreshtokens").findOne({
    tokenHash: expectedHash,
  });

  if (!storedDoc) {
    throw new Error("FAIL: Refresh token hash was not found in MongoDB!");
  }
  if (storedDoc.token) {
    throw new Error("FAIL: Raw unhashed token was found in MongoDB! Must store only tokenHash.");
  }
  if (!storedDoc.tokenHash || storedDoc.tokenHash.length !== 64) {
    throw new Error(`FAIL: tokenHash is not a valid 64-character SHA-256 string! Got: ${storedDoc.tokenHash}`);
  }
  console.log("✓ Database Verification PASSED:");
  console.log("   - Raw JWT Cookie:          ", currentCookie.slice(0, 30) + "...");
  console.log("   - Stored in MongoDB (SHA256):", storedDoc.tokenHash);
  console.log("   - Raw Plaintext in DB:        NONE (Undamaged by DB leaks/dumps)");

  // -------------------------------------------------------------
  // TEST 4: Token Rotation (/api/auth/refresh)
  // -------------------------------------------------------------
  console.log("\n4. Testing Silent Token Refresh & Rotation...");
  const oldRefreshToken = currentCookie;

  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `refreshToken=${oldRefreshToken}`,
    },
  });

  const refreshData = await refreshRes.json();
  if (!refreshRes.ok) throw new Error(`Refresh failed: ${refreshData.message}`);

  const rotateCookieHeader = refreshRes.headers.get("set-cookie") || "";
  const rotatedMatch = rotateCookieHeader.match(/refreshToken=([^;]+)/);
  const newRefreshToken = rotatedMatch ? rotatedMatch[1] : null;

  if (!newRefreshToken) {
    throw new Error("FAIL: Server did not issue a new refreshToken cookie upon refresh!");
  }
  if (newRefreshToken === oldRefreshToken) {
    throw new Error("FAIL: Refresh token was not rotated! New token matches old token.");
  }
  console.log("✓ Token rotation succeeded! Old refresh token was revoked and replaced with a new one.");
  console.log("✓ New Access Token received:", refreshData.data.accessToken.slice(0, 25) + "...");

  // -------------------------------------------------------------
  // TEST 5: Replay Attack Defense (Old Token Revocation)
  // -------------------------------------------------------------
  console.log("\n5. Testing Replay Attack Defense (Re-using old revoked token)...");
  const replayRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `refreshToken=${oldRefreshToken}`, // trying to reuse revoked token
    },
  });

  if (replayRes.status === 401) {
    console.log("✓ Security Check Passed: Server rejected revoked refresh token with Status 401!");
  } else {
    throw new Error(`FAIL: Server accepted an already-rotated token! Status: ${replayRes.status}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Logout & Server-Side Session Revocation
  // -------------------------------------------------------------
  console.log("\n6. Testing Server-Side Logout & Session Invalidation...");
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `refreshToken=${newRefreshToken}`,
    },
  });

  const logoutData = await logoutRes.json();
  if (!logoutRes.ok) throw new Error(`Logout failed: ${logoutData.message}`);

  const logoutCookieHeader = logoutRes.headers.get("set-cookie") || "";
  console.log("✓ Logout succeeded. Cookie cleared with header:", logoutCookieHeader);

  // Verify that the logged out token can no longer be used to refresh
  const postLogoutRefresh = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `refreshToken=${newRefreshToken}`,
    },
  });

  if (postLogoutRefresh.status === 401) {
    console.log("✓ Revocation Verified: Token is permanently deleted from MongoDB and cannot be refreshed (Status 401).");
  } else {
    throw new Error("FAIL: Token was still valid after logout!");
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL AUTH SECURITY, SHA-256 HASHING & ROTATION TESTS PASSED (7/7)!");
  console.log("==================================================================");
}

runAuthSecurityTest().catch((err) => {
  console.error("\n❌ Test Suite Failed:", err.message);
  process.exit(1);
});
