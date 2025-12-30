const mongoose = require("mongoose");

const PaypalPaymentSchema = new mongoose.Schema(
  {
    paypal_order_id: String,
    payer_email: String,
    amount: Number,
    currency: String,
    status: String,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaypalPayment", PaypalPaymentSchema);
