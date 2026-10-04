const bookingService = require("../services/bookingService");
const wrapAsync=require("../utils/wrapAsync");

exports.createBooking = wrapAsync(async (req,res,next)=>{
    const booking = await bookingService.createBooking({
      userId: req.user._id ,  
      showId: req.body.showId,
      seatIds: req.body.seatIds
    });
    res.status(201).json({
        success: true,
        message: "Booking created successfully, Please complete payment within 5 minutes",
        data: booking
  });
});

exports.getSeatAvailabilty=wrapAsync(async(req,res)=>{
    const seats=await bookingService.getSeatAvailabilty(req.params.showId);
    res.status(200).json({
        success: true,
        message: "Seat availability fetched successfully",
        data: seats
  });
});

exports.confirmBooking =wrapAsync( async (req,res)=>{
    const booking = await bookingService.confirmBooking(
        req.params.bookingId,
        req.user._id
    );
    res.status(200).json({
        success: true,
        message: "Booking confirmed and payment processed successfully",
        data: booking
  });
});

exports.cancelBooking = wrapAsync(async (req,res)=>{
    const booking = await bookingService.cancelBooking(
        req.params.bookingId,
        req.user._id
    );
    res.status(200).json({
        success: true,
        message: "Booking cancelled successfully",
        data: booking
  });
});


exports.getMyBookings=wrapAsync(async (req,res)=>{
    const userId=req.user._id;
    
    if (!userId) {
        throw new Error("User identification is required to view bookings.");
    }
    const bookings=await bookingService.getUserBookings(userId);
    
    res.status(200).json({
        success: true,
        message: "Bookings fetched successfully",
        data: bookings
  });
});

exports.getBookingById = wrapAsync(async (req, res) => {
    const booking = await bookingService.getBookingById(
        req.params.bookingId,
        req.user._id
    );
    res.status(200).json({
        success: true,
        message: "Booking fetched successfully",
        data: booking
    });
});