const mongoose = require("mongoose");

const RazorPaymentSchema = new mongoose.Schema(
  {
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    amount: Number,
    currency: String,
    status: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("RazorPayment", RazorPaymentSchema);
