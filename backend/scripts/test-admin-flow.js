const BASE_URL = "http://127.0.0.1:3000/api";

async function runAdminSecurityAndFlowTest() {
  console.log("==================================================================");
  console.log("🛡️ TEST SUITE: Admin RBAC, 403 Forbidden Guard & Back-Office Flow");
  console.log("==================================================================");

  // 1. Register a regular customer
  console.log("\n1. Authenticating as standard customer (role: user)...");
  const userEmail = `cust_${Date.now()}@example.com`;
  const userReg = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Normal User", email: userEmail, password: "password123" }),
  });
  const userData = await userReg.json();
  const userToken = userData.data.accessToken;
  console.log(`✓ Standard user authenticated: ${userEmail} (role: ${userData.data.user.role})`);

  // 2. Test 403 Forbidden for Regular User on Admin Endpoints
  console.log("\n2. Testing 403 Forbidden enforcement on Admin APIs for standard user...");
  
  // Test POST /movies as regular user
  const movieForbiddenRes = await fetch(`${BASE_URL}/movies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      title: "Hacked Movie",
      description: "Should be blocked by admin middleware",
      duration: 100,
      genre: ["Action"],
      language: "english",
      releaseDate: new Date(),
      status: "active",
    }),
  });
  if (movieForbiddenRes.status === 403) {
    console.log("✓ Security Verified: POST /api/movies returned 403 Forbidden for non-admin");
  } else {
    throw new Error(`FAIL: Expected 403 on POST /movies, got ${movieForbiddenRes.status}`);
  }

  // Test POST /shows as regular user
  const showForbiddenRes = await fetch(`${BASE_URL}/shows`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      movieId: "000000000000000000000000",
      screenId: "000000000000000000000000",
      startTime: new Date(Date.now() + 100000),
      basePrice: 200,
    }),
  });
  if (showForbiddenRes.status === 403) {
    console.log("✓ Security Verified: POST /api/shows returned 403 Forbidden for non-admin");
  } else {
    throw new Error(`FAIL: Expected 403 on POST /shows, got ${showForbiddenRes.status}`);
  }

  // 3. Login as Admin
  console.log("\n3. Authenticating as Administrator (pranitbijave27@gmail.com / admin@example.com)...");
  let adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "pranitbijave27@gmail.com", password: "admin123" }),
  });
  if (!adminLoginRes.ok) {
    adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "admin123" }),
    });
  }
  const adminData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${adminData.message}`);
  
  const adminToken = adminData.data.accessToken;
  const adminUser = adminData.data.user;
  if (adminUser.role !== "admin") {
    throw new Error(`FAIL: Expected user.role === 'admin', got ${adminUser.role}`);
  }
  console.log(`✓ Admin login successful! Email: "${adminUser.email}", Role: "${adminUser.role}". Eligible for auto-redirect to /admin.`);

  // 4. Admin creates a movie via POST /api/movies
  console.log("\n4. Testing Movie Ingestion as Admin (POST /api/movies)...");
  const testMovieTitle = `Oppenheimer IMAX ${Date.now()}`;
  const createMovieRes = await fetch(`${BASE_URL}/movies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: testMovieTitle,
      description: "The story of American scientist J. Robert Oppenheimer and his role in the Manhattan Project.",
      duration: 180,
      genre: ["Drama", "Thriller"],
      language: "english",
      releaseDate: new Date("2026-10-01"),
      status: "active",
    }),
  });
  const createdMovieData = await createMovieRes.json();
  if (createMovieRes.status !== 201) {
    throw new Error(`Movie creation failed: ${createdMovieData.message}`);
  }
  const createdMovieId = createdMovieData.data._id;
  console.log(`✓ Admin successfully created movie: "${testMovieTitle}" (ID: ${createdMovieId})`);

  // 5. Admin creates a Screen via POST /api/screens (auto-attaching to single theater)
  console.log("\n5. Testing Screen Creation as Admin (POST /api/screens)...");
  const screenName = `Screen Atmos ${Date.now() % 10000}`;
  const createScreenRes = await fetch(`${BASE_URL}/screens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: screenName,
      layoutType: "imax",
      seatsPerRow: 6,
      rows: [
        { name: "A", type: "regular" },
        { name: "B", type: "premium" },
        { name: "C", type: "vip" },
      ],
    }),
  });
  const createdScreenData = await createScreenRes.json();
  if (createScreenRes.status !== 201) {
    throw new Error(`Screen creation failed: ${createdScreenData.message}`);
  }
  const targetScreen = createdScreenData.data;
  console.log(`✓ Admin successfully created Screen "${targetScreen.name}" (${targetScreen.totalSeats} seats) automatically bound to Cinema Theater.`);

  // 6. Admin schedules show via POST /api/shows
  console.log("\n6. Scheduling Showtime as Admin (POST /api/shows)...");
  const futureStartTime = new Date(Date.now() + (Math.floor(Math.random() * 500) + 50) * 3600 * 1000);
  const createShowRes = await fetch(`${BASE_URL}/shows`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      movieId: createdMovieId,
      screenId: targetScreen._id,
      startTime: futureStartTime.toISOString(),
      basePrice: 350,
    }),
  });
  const createdShowData = await createShowRes.json();
  if (createShowRes.status !== 201) {
    throw new Error(`Show creation failed: ${createdShowData.message}`);
  }
  console.log(`✓ Showtime successfully scheduled for ${futureStartTime.toLocaleString()} with base price ₹350!`);

  // 7. Admin archives movie via PATCH /api/movies/:id/archive
  console.log("\n7. Soft-deleting/archiving movie as Admin (PATCH /api/movies/:id/archive)...");
  const archiveRes = await fetch(`${BASE_URL}/movies/${createdMovieId}/archive`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const archiveData = await archiveRes.json();
  if (archiveRes.status !== 200) {
    throw new Error(`Movie archiving failed: ${archiveData.message}`);
  }
  console.log(`✓ Movie "${testMovieTitle}" successfully archived (status: "${archiveData.data.status}").`);

  console.log("\n==================================================================");
  console.log("🎉 ALL ADMIN RBAC, SECURITY GUARDS & BACK-OFFICE TESTS PASSED!");
  console.log("==================================================================");
}

runAdminSecurityAndFlowTest().catch((err) => {
  console.error("\n❌ Test Suite Failed:", err.message);
  process.exit(1);
});
