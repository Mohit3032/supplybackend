const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Booking = require("../models/Booking");
const RazorPayment = require("../models/RazorPayment");
const { generateInvoiceAndSendEmail } = require("../utils/InvoiceHelper");
require("dotenv").config();

// Fixed USD → INR rate
const USD_TO_INR = Number(process.env.FIXED_USD_TO_INR) || 83;

// Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// -----------------------------
// CREATE BOOKING
// -----------------------------
router.post("/bookings", async (req, res) => {
  try {
    const { type, delegates, subtotal, tax, sponsorship, speakerpass } = req.body;

    // Validate booking type
    if (!type || !["pass", "sponsorship", "speakerpass"].includes(type)) {
      return res.status(400).json({ success: false, error: "Invalid booking type" });
    }

    // === PASS BOOKINGS ===
    if (type === "pass") {
      if (!delegates || !Array.isArray(delegates) || delegates.length === 0) {
        return res.status(400).json({ success: false, error: "Delegates are required" });
      }

      // Discount calculation
      let discountRate = 0;
      if (delegates.length >= 5) discountRate = 0.2;
      else if (delegates.length >= 3) discountRate = 0.15;
      else if (delegates.length >= 2) discountRate = 0.1;

      const discount = (Number(subtotal) || 0) * discountRate;
      const total = (Number(subtotal) || 0) - discount + (Number(tax) || 0);

      const booking = await Booking.create({
        type,
        delegates,
        subtotal: Number(subtotal),
        discount,
        tax: Number(tax),
        total,
        currency: "USD", // always store in USD
        paymentMethod: null,
        status: "pending",
      });

      return res.json({ success: true, booking, bookingId: booking._id });
    }

    // === SPONSORSHIP BOOKINGS ===
    if (type === "sponsorship") {
      if (
        !sponsorship ||
        !sponsorship.firstName ||
        !sponsorship.lastName ||
        !sponsorship.email ||
        !sponsorship.package
      ) {
        return res.status(400).json({ success: false, error: "Missing sponsorship details" });
      }

      const total = Number(req.body.total) || 0;

      const booking = await Booking.create({
        type,
        sponsorship: {
          firstName: sponsorship.firstName,
          lastName: sponsorship.lastName,
          company: sponsorship.company || "", // ✅ added
          email: sponsorship.email,
          package: sponsorship.package,
        },
        subtotal: total,
        discount: 0,
        tax: 0,
        total,
        currency: "USD",
        paymentMethod: null,
        status: "pending",
      });

      return res.json({ success: true, booking, bookingId: booking._id });
    }

    // === SPEAKER PASS BOOKINGS ===
    if (type === "speakerpass") {
      if (
        !speakerpass ||
        !speakerpass.firstName ||
        !speakerpass.lastName ||
        !speakerpass.email
      ) {
        return res.status(400).json({ success: false, error: "Missing speaker pass details" });
      }

      const total = Number(req.body.total) || 0;

      const booking = await Booking.create({
        type,
        speakerpass: {
          firstName: speakerpass.firstName,
          lastName: speakerpass.lastName,
          company: speakerpass.company || "", // ✅ added
          email: speakerpass.email,
          topic: speakerpass.topic || "",
          package: speakerpass.package || "Speaker Pass",
        },
        subtotal: total,
        discount: 0,
        tax: 0,
        total,
        currency: "USD",
        paymentMethod: null,
        status: "pending",
      });

      return res.json({ success: true, booking, bookingId: booking._id });
    }
  } catch (err) {
    console.error("❌ Error in /bookings:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// -----------------------------
// GET ALL BOOKINGS
// -----------------------------
router.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (err) {
    console.error("❌ Error fetching bookings:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve bookings" });
  }
});

// -----------------------------
// CREATE RAZORPAY ORDER
// -----------------------------
router.post("/create-order", async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: "Missing bookingId" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Convert USD → INR
    let amountInINR = booking.total;
    if (booking.currency === "USD") amountInINR = Math.round(amountInINR * USD_TO_INR);

    const amountInPaise = amountInINR * 100;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `booking_${Date.now()}`,
      notes: { bookingId },
    });

    res.json(order);
  } catch (err) {
    console.error("❌ Razorpay order error:", err);
    res.status(500).json({ error: "Razorpay order creation failed", details: err.message });
  }
});

// -----------------------------
// VERIFY RAZORPAY PAYMENT
// -----------------------------
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, amount } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return res.status(400).json({ error: "Missing required params" });
    }

    // Verify signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const expectedSignature = hmac.digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Save payment
    await RazorPayment.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
      amount,
      currency: "INR",
      status: "paid",
    });

    // Update booking
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.paid = true;
    booking.currency = "INR";
    booking.amountPaid = amount ? amount / 100 : booking.total * USD_TO_INR;
    booking.paymentMethod = "razorpay";
    booking.status = "confirmed";

    await booking.save();

    // Generate invoice
    try {
      await generateInvoiceAndSendEmail(booking);
      console.log(`✅ Invoice emailed successfully for ${booking.type} booking`);
    } catch (invoiceErr) {
      console.error("⚠️ Invoice/email failed:", invoiceErr.message);
    }

    res.json({ success: true, message: "Payment verified", bookingId: booking._id });
  } catch (err) {
    console.error("❌ Razorpay verify error:", err);
    res.status(500).json({ error: "Verification failed", details: err.message });
  }
});

module.exports = router;
