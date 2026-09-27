const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true
    },

    seats: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Seat",
      }],
      validate: {
        validator: val => val.length > 0,
        message: "At least one seat is required"
      }
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    //is booking successfull or not
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired"],
      default: "pending"
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },

    expiresAt: {
      type: Date
    }
  },
  { timestamps: true }
);
bookingSchema.index({ showId: 1, seats: 1 });
bookingSchema.index({ userId: 1 });

bookingSchema.index({ expiresAt: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
