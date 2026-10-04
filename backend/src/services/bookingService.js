const Seat = require("../models/Seat");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const ShowSeat = require("../models/ShowSeat");
const { simulatePayment } = require("../services/paymentService");
const AppError = require("../utils/AppError");
const { withTransaction } = require("../utils/transactionHelper");

exports.createBooking = async ({ userId, showId, seatIds }) => {
    if (seatIds.length > 10) {
        throw new AppError("More than 10 seats not allowed", 400);
    }

    return await withTransaction(async (session) => {
        const queryOptions = session ? { session } : {};

        const show = await Show.findById(showId, null, queryOptions);

        if (!show) {
            throw new AppError("Show not found", 404);
        }

        if (show.status !== "scheduled") {
            throw new AppError("Show not available", 400);
        }

        if (show.startTime <= new Date()) {
            throw new AppError("Show already started or completed", 400);
        }

        const seats = await Seat.find({
            _id: { $in: seatIds },
            screenId: show.screenId,
            isActive: true
        }, null, queryOptions);

        if (seats.length !== seatIds.length) {
            throw new AppError("Invalid seats selected", 400);
        }

        // Fast pre-check: verify seats are not already locked or booked
        const existingLock = await ShowSeat.findOne({
            showId,
            seatId: { $in: seatIds }
        }, null, queryOptions);

        if (existingLock) {
            throw new AppError("Some seats are already reserved or booked", 409);
        }

        let totalAmount = seats.reduce((sum, seat) => {
            let multiplier = 1;
            if (seat.type === "premium") multiplier = 1.45;
            if (seat.type === "vip") multiplier = 1.75;

            return sum + show.basePrice * multiplier;
        }, 0);

        totalAmount = Math.ceil(totalAmount);

        if (totalAmount % 10 === 0) {
            totalAmount = totalAmount - 1;
        }

        // 5 minutes lock for seats
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        let booking = null;
        try {
            const bookingDocs = await Booking.create(
                [{
                    userId,
                    showId,
                    seats: seatIds,
                    totalAmount,
                    expiresAt
                }],
                queryOptions
            );
            booking = bookingDocs[0];

            // Atomic lock insertion: Enforced by the compound unique index { showId: 1, seatId: 1 }.
            // If two concurrent requests hit at the exact same millisecond, MongoDB write engine
            // will throw duplicate key error code 11000 on the second insert, preventing double booking.
            const showSeatsToLock = seatIds.map((seatId) => ({
                showId,
                seatId,
                bookingId: booking._id,
                status: "locked",
                expiresAt
            }));

            await ShowSeat.insertMany(showSeatsToLock, queryOptions);

            return booking;
        } catch (err) {
            // If running without transaction (standalone Mongo), rollback created booking manually
            if (!session && booking) {
                await Booking.deleteOne({ _id: booking._id });
                await ShowSeat.deleteMany({ bookingId: booking._id }); // clean up any partial inserts
            }

            if (err.code === 11000) {
                throw new AppError("One or more selected seats were just taken by another user", 409);
            }
            throw err;
        }
    });
};

exports.getSeatAvailabilty = async (showId) => {
    const show = await Show.findById(showId);
    if (!show) {
        throw new AppError("Show not found", 404);
    }

    const seats = await Seat.find({
        screenId: show.screenId,
        isActive: true,
    }).sort({ row: 1, number: 1 });

    const activeLocks = await ShowSeat.find({ showId });
    const lockedMap = new Map();
    activeLocks.forEach((lock) => {
        lockedMap.set(lock.seatId.toString(), lock.status);
    });

    const result = seats.map((seat) => {
        const seatIdStr = seat._id.toString();
        const lockStatus = lockedMap.get(seatIdStr);
        return {
            _id: seat._id,
            row: seat.row,
            number: seat.number,
            type: seat.type,
            isBooked: Boolean(lockStatus),
            status: lockStatus || "available"
        };
    });
    return result;
};

exports.confirmBooking = async (bookingId, userId) => {
    const booking = await Booking.findById(bookingId);

    if (!booking)
        throw new AppError("Booking not found", 404);

    if (booking.status !== "pending")
        throw new AppError("Booking cannot be confirmed", 400);

    if (booking.userId.toString() !== userId.toString())
        throw new AppError("Unauthorized", 403);

    if (booking.expiresAt && booking.expiresAt < new Date())
        throw new AppError("Booking expired", 400);

    const payment = await simulatePayment({
        amount: booking.totalAmount,
        userId: booking.userId,
        bookingId: booking._id
    });

    if (!payment.success) {
        throw new AppError("Payment failed", 400);
    }

    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    booking.expiresAt = null;

    await booking.save();

    // Mark seats as permanently booked
    await ShowSeat.updateMany(
        { bookingId: booking._id },
        { status: "booked", expiresAt: null }
    );

    await booking.populate([
        {
            path: "showId",
            populate: [
                { path: "movieId", select: "title duration posterUrl genre language releaseDate" },
                { path: "screenId", populate: { path: "theaterId", select: "name city address" } }
            ]
        },
        { path: "seats", select: "row number type" }
    ]);

    return booking;
};

exports.cancelBooking = async (bookingId, userId) => {
    const booking = await Booking.findById(bookingId);

    if (!booking)
        throw new AppError("Booking not found", 404);
    if (booking.status === "cancelled")
        throw new AppError("Booking already cancelled", 400);
    if (booking.status === "expired") {
        throw new AppError("Cannot cancel an expired booking", 400);
    }

    if (booking.userId.toString() !== userId.toString())
        throw new AppError("Unauthorized", 403);

    const show = await Show.findById(booking.showId);

    if (!show)
        throw new AppError("Show not found", 404);

    const currentTime = new Date();
    const showTime = new Date(show.startTime);
    const timeDifference = showTime - currentTime;

    // The 2-hour cancellation rule applies to paid/confirmed bookings
    // For pending holds, the user is immediately releasing temporary locked seats
    if (booking.status === "confirmed") {
        if (timeDifference < 0) throw new AppError("Cannot cancel a show that has already started or finished", 400);
        if (timeDifference < 2 * 60 * 60 * 1000) throw new AppError("Cannot cancel within 2 hours of showtime", 400);
    }

    booking.status = "cancelled";

    if (booking.paymentStatus === "paid") {
        booking.paymentStatus = "refunded";
    } else {
        booking.paymentStatus = "failed";
    }
    booking.expiresAt = null;

    await booking.save();

    // Release seat locks immediately
    await ShowSeat.deleteMany({ bookingId: booking._id });

    return booking;
};

exports.getUserBookings = async (userId) => {
    const bookings = await Booking.find({ userId })
        .populate({
            path: "showId",
            populate: [
                {
                    path: "movieId",
                    select: "title duration posterUrl"
                },
                {
                    path: "screenId",
                    populate: {
                        path: "theaterId",
                        select: "name city"
                    }
                }
            ]
        }).populate({
            path: "seats",
            select: "row number"
        }).sort({ createdAt: -1 });
    return bookings;
};

exports.getBookingById = async (bookingId, userId) => {
    const booking = await Booking.findById(bookingId)
        .populate({
            path: "showId",
            populate: [
                {
                    path: "movieId",
                    select: "title duration posterUrl genre language releaseDate"
                },
                {
                    path: "screenId",
                    populate: {
                        path: "theaterId",
                        select: "name city address"
                    }
                }
            ]
        }).populate({
            path: "seats",
            select: "row number type"
        });

    if (!booking) throw new AppError("Booking not found", 404);
    if (booking.userId.toString() !== userId.toString()) {
        throw new AppError("Unauthorized to access this booking", 403);
    }
    return booking;
};