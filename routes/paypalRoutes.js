// routes/paypal.js
const express = require("express");
const axios = require("axios");
const Booking = require("../models/Booking");
const Payment = require("../models/PaypalPayment");
const { generateInvoiceAndSendEmail } = require("../utils/InvoiceHelper");
require("dotenv").config();

const router = express.Router();

const PAYPAL_API = process.env.PAYPAL_BASE_URL; // dynamic (sandbox or live)
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// -------------------------
// Get PayPal Access Token
// -------------------------
async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return res.data.access_token;
}

// -------------------------
// Create PayPal order
// frontend calls: POST /api/payment/paypal/create-order { bookingId }
router.post("/create-order", async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: "Missing bookingId" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const accessToken = await getAccessToken();

    const orderRes = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: booking._id.toString(),
            amount: {
              currency_code: "USD",
              value: Number(booking.total).toFixed(2),
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Return the full PayPal response so frontend can pick .id
    res.json(orderRes.data);
  } catch (err) {
    console.error("❌ PayPal order error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "PayPal order creation failed", details: err.response?.data || err.message });
  }
});

// -------------------------
// Capture PayPal order
// frontend calls: POST /api/payment/paypal/capture-order { orderId, bookingId }
router.post("/capture-order", async (req, res) => {
  try {
    const { orderId, bookingId } = req.body;
    if (!orderId || !bookingId) {
      return res.status(400).json({ error: "Missing params" });
    }

    const accessToken = await getAccessToken();

    const captureRes = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = captureRes.data;
    if (!captureData || captureData.status !== "COMPLETED") {
      return res.status(400).json({ error: "Payment not completed", details: captureData });
    }

    // Save payment record
    await Payment.create({
      bookingId,
      paypalOrderId: orderId,
      details: captureData,
      status: "paid",
    });

    // Update booking → mark paid
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.paid = true;
    booking.currency = "USD";
    booking.amountPaid = booking.total;
    booking.paymentMethod = "paypal";
    booking.status = "confirmed";
    await booking.save();

    // ✅ Generate invoice + send emails (best effort)
    try {
      await generateInvoiceAndSendEmail(booking);
      console.log("✅ Invoice sent for PayPal booking:", booking._id);
    } catch (invoiceErr) {
      console.error("⚠️ Invoice/email failed after PayPal capture:", invoiceErr);
      // don't fail the payment flow because invoice/email failed; inform admin separately
    }

    res.json({ success: true, message: "PayPal payment captured & invoice sent", bookingId: booking._id });
  } catch (err) {
    console.error("❌ PayPal capture error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "PayPal capture failed", details: err.response?.data || err.message });
  }
});

module.exports = router;
