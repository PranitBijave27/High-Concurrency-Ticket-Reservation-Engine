const BASE_URL = "http://localhost:3000/api";

async function apiRequest(endpoint, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data.message || `Request failed with status ${res.status}`);
        err.response = { status: res.status, data };
        throw err;
    }
    return data;
}

async function testPiece4Checkout() {
    console.log("=== Testing Piece 4: 5-Minute Hold & Checkout Pipeline ===");

    // 1. Authenticate user (register if needed)
    const testEmail = `checkout_test_${Date.now()}@example.com`;
    const registerRes = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
            name: "Checkout Tester",
            email: testEmail,
            password: "password123"
        })
    });
    const token = registerRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(`✓ Registered and authenticated test user (${testEmail})`);

    // 2. Fetch movies and an active show
    const moviesRes = await apiRequest("/movies");
    const movies = moviesRes.data;
    if (!movies || movies.length === 0) {
        throw new Error("No movies found to test.");
    }
    const movie = movies[0];

    let show = null;
    let selectedMovie = null;
    for (const m of movies) {
        const showsRes = await apiRequest(`/shows/movie/${m._id}`);
        if (showsRes.data && showsRes.data.length > 0) {
            show = showsRes.data[0];
            selectedMovie = m;
            break;
        }
    }

    if (!show) {
        throw new Error("No shows found for any movie.");
    }
    console.log(`✓ Retrieved Show ID: ${show._id} for movie: "${selectedMovie.title}"`);

    // 3. Get seat availability
    const availRes = await apiRequest(`/bookings/show/${show._id}/availability`);
    const availableSeats = availRes.data.filter(s => s.status === "available");
    if (availableSeats.length < 2) {
        throw new Error("Not enough available seats to test.");
    }
    const testSeat1 = availableSeats[0]._id;
    const testSeat2 = availableSeats[1]._id;
    console.log(`✓ Found available seats: ${availableSeats[0].row}${availableSeats[0].number} and ${availableSeats[1].row}${availableSeats[1].number}`);

    // 4. Test Hold Creation (POST /api/bookings)
    const holdRes = await apiRequest("/bookings", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
            showId: show._id,
            seatIds: [testSeat1]
        })
    });
    const holdBooking = holdRes.data;
    console.log(`✓ Created hold booking: ${holdBooking._id}, status: ${holdBooking.status}, expiresAt: ${holdBooking.expiresAt}`);

    // 5. Test Fetch Booking Details (GET /api/bookings/:bookingId)
    const getRes = await apiRequest(`/bookings/${holdBooking._id}`, {
        headers: authHeaders
    });
    const fetchedBooking = getRes.data;
    if (fetchedBooking.showId?.movieId?.title && fetchedBooking.seats?.length === 1) {
        console.log(`✓ GET /api/bookings/:id returned fully populated show and seat details`);
    } else {
        throw new Error("GET /api/bookings/:id did not return expected populated structure");
    }

    // 6. Test Cancel/Release of Pending Hold (PATCH /api/bookings/:id/cancel)
    const cancelRes = await apiRequest(`/bookings/${holdBooking._id}/cancel`, {
        method: "PATCH",
        headers: authHeaders
    });
    console.log(`✓ Cancelled pending hold: status is now ${cancelRes.data.status}`);

    // Check that the seat is immediately available again
    const postCancelAvail = await apiRequest(`/bookings/show/${show._id}/availability`);
    const seatAfterCancel = postCancelAvail.data.find(s => s._id.toString() === testSeat1.toString());
    if (seatAfterCancel.status === "available") {
        console.log(`✓ Seat ${seatAfterCancel.row}${seatAfterCancel.number} immediately returned to 'available' pool upon hold cancellation!`);
    } else {
        throw new Error(`Expected seat to be available after cancel, got: ${seatAfterCancel.status}`);
    }

    // 7. Test Successful Checkout Confirmation (POST -> PATCH confirm)
    const holdRes2 = await apiRequest("/bookings", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
            showId: show._id,
            seatIds: [testSeat2]
        })
    });
    const holdBooking2 = holdRes2.data;
    console.log(`✓ Created second hold for confirmation test: ${holdBooking2._id}`);

    // Confirm booking (simulated payment with retry if declined)
    let confirmSuccess = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            const confirmRes = await apiRequest(`/bookings/${holdBooking2._id}/confirm`, {
                method: "PATCH",
                headers: authHeaders
            });
            const confirmedBooking = confirmRes.data;
            if (confirmedBooking.status === "confirmed" && confirmedBooking.paymentStatus === "paid") {
                console.log(`✓ Confirmed booking on attempt ${attempt}: status=${confirmedBooking.status}, paymentStatus=${confirmedBooking.paymentStatus}`);
                console.log(`✓ Populated Movie: "${confirmedBooking.showId?.movieId?.title}", Seats: ${confirmedBooking.seats?.map(s => s.row + s.number).join(", ")}`);
                confirmSuccess = true;
                break;
            }
        } catch (err) {
            console.log(`  (Mock payment attempt ${attempt} declined, retrying...)`);
        }
    }

    if (!confirmSuccess) {
        throw new Error("Confirmation failed across 5 attempts");
    }

    // 8. Verify the confirmed seat is now permanently 'booked'
    const postConfirmAvail = await apiRequest(`/bookings/show/${show._id}/availability`);
    const seatAfterConfirm = postConfirmAvail.data.find(s => s._id.toString() === testSeat2.toString());
    if (seatAfterConfirm.status === "booked" && seatAfterConfirm.isBooked === true) {
        console.log(`✓ Seat ${seatAfterConfirm.row}${seatAfterConfirm.number} is now permanently 'booked' in availability endpoint!`);
    } else {
        throw new Error(`Expected seat to be booked, got: ${seatAfterConfirm.status}`);
    }

    console.log("\n=== ALL PIECE 4 BACKEND & CHECKOUT PIPELINE TESTS PASSED! ===");
}

testPiece4Checkout().catch(err => {
    console.error("Test failed:", err.response?.data || err.message);
    process.exit(1);
});
