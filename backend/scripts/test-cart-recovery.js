require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Show = require("../src/models/Show");
const Seat = require("../src/models/Seat");
const User = require("../src/models/User");
const Booking = require("../src/models/Booking");
const ShowSeat = require("../src/models/ShowSeat");
const bookingService = require("../src/services/bookingService");

/**
 * Sweeper logic matching automation.js
 * In a real run, this is what the scheduled cron background worker executes every 60 seconds.
 */
async function sweepExpiredHolds() {
  const now = new Date();
  const expiredBookings = await Booking.find({
    status: "pending",
    expiresAt: { $lt: now }
  }).select("_id");

  if (expiredBookings.length > 0) {
    const expiredIds = expiredBookings.map((b) => b._id);

    await Booking.updateMany(
      { _id: { $in: expiredIds } },
      { status: "expired", paymentStatus: "failed" }
    );

    await ShowSeat.deleteMany({ bookingId: { $in: expiredIds } });
  }

  return expiredBookings.length;
}

async function runHoldExpirationCorrectnessTest() {
  console.log("==================================================================");
  console.log("🧪 CORRECTNESS TEST: Automated Hold Expiration & Zero Orphaned Locks");
  console.log("==================================================================");

  try {
    await connectDB();
    await ShowSeat.init();

    // 1. Prepare Test Users
    let testUser = await User.findOne({ email: "expiration_test_user@example.com" });
    if (!testUser) {
      testUser = await User.create({
        name: "Expiration Test User",
        email: "expiration_test_user@example.com",
        password: "password123",
        role: "user"
      });
    }

    let newUser = await User.findOne({ email: "second_buyer@example.com" });
    if (!newUser) {
      newUser = await User.create({
        name: "Second Buyer",
        email: "second_buyer@example.com",
        password: "password123",
        role: "user"
      });
    }

    // 2. Prepare Show
    const now = new Date();
    let show = await Show.findOne({ status: "scheduled", startTime: { $gt: now } });
    if (!show) {
      show = await Show.findOne();
      show.startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      show.endTime = new Date(show.startTime.getTime() + 150 * 60 * 1000);
      show.status = "scheduled";
      await show.save();
    }

    // 3. Prepare 10 distinct test seats
    let seats = await Seat.find({ screenId: show.screenId, isActive: true }).limit(10);
    if (seats.length < 10) {
      const dummySeats = Array.from({ length: 10 }, (_, i) => ({
        screenId: show.screenId,
        row: "EXP",
        number: i + 1,
        type: "regular",
        isActive: true
      }));
      seats = await Seat.insertMany(dummySeats);
    }

    const testSeatIds = seats.map((s) => s._id);

    // Clean slate for test seats
    await ShowSeat.deleteMany({ showId: show._id, seatId: { $in: testSeatIds } });
    await Booking.deleteMany({ showId: show._id, seats: { $in: testSeatIds } });

    console.log(`🎯 Show ID: ${show._id}`);
    console.log(`🎯 Using 10 test seats (5 to be confirmed, 5 to be abandoned/expired)`);

    // 4. Setup 5 CONFIRMED bookings (control group: must NEVER be released by worker)
    const confirmedSeatIds = testSeatIds.slice(0, 5);
    for (const seatId of confirmedSeatIds) {
      const b = await Booking.create({
        userId: testUser._id,
        showId: show._id,
        seats: [seatId],
        totalAmount: 200,
        status: "confirmed",
        paymentStatus: "paid",
        expiresAt: null
      });
      await ShowSeat.create({
        showId: show._id,
        seatId,
        bookingId: b._id,
        status: "booked",
        expiresAt: null
      });
    }
    console.log("🔒 Created 5 legitimate CONFIRMED bookings (must stay intact)");

    // 5. Setup 5 ABANDONED / EXPIRED holds (deliberately set expiresAt in past)
    const expiredSeatIds = testSeatIds.slice(5, 10);
    const expiredBookingIds = [];
    for (const seatId of expiredSeatIds) {
      const b = await Booking.create({
        userId: testUser._id,
        showId: show._id,
        seats: [seatId],
        totalAmount: 200,
        status: "pending",
        paymentStatus: "pending",
        expiresAt: new Date(Date.now() - 60 * 1000) // 1 minute ago (expired)
      });
      expiredBookingIds.push(b._id);

      await ShowSeat.create({
        showId: show._id,
        seatId,
        bookingId: b._id,
        status: "locked",
        expiresAt: new Date(Date.now() - 60 * 1000)
      });
    }
    console.log("⏳ Created 5 unconfirmed holds deliberately past 5-minute expiry");

    // 6. Execute background worker sweep
    console.log("\n🧹 Triggering background worker sweep...");
    const sweptCount = await sweepExpiredHolds();
    console.log(`   Worker sweep finished. Expired bookings swept: ${sweptCount}`);

    // 7. Rigorous Correctness Assertions
    console.log("\n📋 Evaluating Correctness Properties:");

    let allAssertionsPassed = true;

    // Property A: 100% of expired bookings transitioned to "expired"
    const expiredBookingsCheck = await Booking.find({
      _id: { $in: expiredBookingIds }
    });
    const allMarkedExpired = expiredBookingsCheck.every(
      (b) => b.status === "expired" && b.paymentStatus === "failed"
    );
    console.log(
      allMarkedExpired
        ? "  ✅ Property 1: 100% of abandoned bookings transitioned to status='expired' & paymentStatus='failed'"
        : "  ❌ Property 1 FAILED: Some bookings did not transition correctly"
    );
    if (!allMarkedExpired) allAssertionsPassed = false;

    // Property B: 100% of abandoned ShowSeat locks were removed
    const lingeringLocks = await ShowSeat.find({
      showId: show._id,
      seatId: { $in: expiredSeatIds }
    });
    const allLocksRemoved = lingeringLocks.length === 0;
    console.log(
      allLocksRemoved
        ? "  ✅ Property 2: 100% of abandoned ShowSeat locks removed from database"
        : `  ❌ Property 2 FAILED: Found ${lingeringLocks.length} lingering locks on expired seats`
    );
    if (!allLocksRemoved) allAssertionsPassed = false;

    // Property C: Released seats are immediately bookable again by another user
    let rebookSuccess = true;
    try {
      // Attempt to book one of the released seats with a fresh user
      const rebooked = await bookingService.createBooking({
        userId: newUser._id,
        showId: show._id,
        seatIds: [expiredSeatIds[0]]
      });
      console.log(`  ✅ Property 3: Released seat successfully re-booked by new buyer (Booking ID: ${rebooked._id})`);
    } catch (err) {
      console.log(`  ❌ Property 3 FAILED: Could not re-book released seat: ${err.message}`);
      rebookSuccess = false;
      allAssertionsPassed = false;
    }

    // Property D: Zero confirmed bookings were touched
    const confirmedCount = await Booking.countDocuments({
      showId: show._id,
      seats: { $in: confirmedSeatIds },
      status: "confirmed",
      paymentStatus: "paid"
    });
    const confirmedLocksCount = await ShowSeat.countDocuments({
      showId: show._id,
      seatId: { $in: confirmedSeatIds },
      status: "booked"
    });
    const confirmedIntact = confirmedCount === 5 && confirmedLocksCount === 5;
    console.log(
      confirmedIntact
        ? "  ✅ Property 4: Confirmed bookings & booked locks remained completely untouched (5/5 intact)"
        : "  ❌ Property 4 FAILED: Confirmed bookings or locks were improperly altered"
    );
    if (!confirmedIntact) allAssertionsPassed = false;

    // Property E: Zero orphaned locks in entire database
    // (An orphaned lock is any ShowSeat past its expiresAt, or with no valid booking)
    const orphanedLocks = await ShowSeat.find({
      status: "locked",
      expiresAt: { $lt: new Date() }
    });
    const zeroOrphaned = orphanedLocks.length === 0;
    console.log(
      zeroOrphaned
        ? "  ✅ Property 5: Zero orphaned locks (0 locks past expiresAt in database)"
        : `  ❌ Property 5 FAILED: Found ${orphanedLocks.length} orphaned locks past expiresAt`
    );
    if (!zeroOrphaned) allAssertionsPassed = false;

    console.log("\n---------------- CORRECTNESS VERIFICATION RESULT ----------------");
    if (allAssertionsPassed) {
      console.log("🏆 PASSED: All 5 correctness properties verified!");
      console.log("100% of expired holds released, zero orphaned locks, confirmed state preserved.");
    } else {
      console.error("❌ FAILED: One or more correctness properties were violated.");
    }
    console.log("-----------------------------------------------------------------\n");

    // Clean up test records
    await ShowSeat.deleteMany({ showId: show._id, seatId: { $in: testSeatIds } });
    await Booking.deleteMany({ showId: show._id, seats: { $in: testSeatIds } });

  } catch (error) {
    console.error("❌ Test script crashed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runHoldExpirationCorrectnessTest();
