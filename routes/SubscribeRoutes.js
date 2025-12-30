const express = require("express");
const router = express.Router();
const Subscriber = require("../models/Subscriber");
const nodemailer = require("nodemailer");

// POST /api/subscribe
router.post("/supply-subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    // ✅ Save to DB (ignore duplicates gracefully)
    let subscriber = await Subscriber.findOne({ email });
    if (!subscriber) {
      subscriber = new Subscriber({ email });
      await subscriber.save();
    }

    // ✅ Use same transporter as Contact
   const transporter = nodemailer.createTransport({
     host: "smtp.office365.com",
     port: 587,
     secure: false, // TLS is upgraded automatically
     auth: {
       user: process.env.EMAIL_USER, // your Outlook email
       pass: process.env.EMAIL_PASS, // your Outlook mailbox password OR app password
     },
   });

    // ✅ Send mail
    await transporter.sendMail({
      from: `"ARO Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Subscription Confirmed ✅",
      html: `<h3>Thank you for subscribing to ARO Events!</h3>
             <p>You will now receive the latest updates about our events.</p>
             <p>— The ARO Events Team</p>`,
    });

    res.json({ message: "Successfully subscribed. Confirmation email sent." });
  } catch (err) {
    console.error("❌ Error in /subscribe full:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET all subscribers (optional, for admin)
router.get("/supply-subscribers", async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (err) {
    console.error("❌ Error fetching subscribers:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
