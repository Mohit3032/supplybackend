const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const Sponsor = require("../models/Sponsor");

// POST /supply-fsponsors
router.post("/supply-fsponsors", async (req, res) => {
  const { firstName, lastName, company, email, phone } = req.body;

  if (!firstName || !lastName || !company || !email ) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  try {
    // Check duplicate by email only
    const existing = await Sponsor.findOne({ email });
    if (existing) {
      return res.json({ success: false, error: "You have already submitted your topic" });
    }

    // Save Sponsor
    await Sponsor.create({
      firstName,
      lastName,
      company, // ✅ ADDED
      email,
      phone,
    });

    // Setup mail
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false, // TLS is upgraded automatically
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const userMailOptions = {
      from: `"ARO Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Thanks for Reaching Out to ARO Events",
      html: `
        <p>Hi ${firstName},</p>
        <p>Thanks for submitting your topic to <b>Supply Chain AI Conference</b>. We’ll review it and get back to you soon.</p>
        <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6;">
          <div style="background:#1d2163; padding:15px; text-align:center; color:#fff; border-radius:6px 6px 0 0;">
            <h2 style="margin:0;">🤝 Thanks for Contacting ARO Events</h2>
          </div>
          <div style="padding:20px; background:#f9f9f9; border:1px solid #ddd; border-top:none; border-radius:0 0 6px 6px;">
            <p>In the meantime, you can explore our upcoming conferences and connect with us here:</p>
            <ul style="list-style:none; padding-left:0;">
              <li>🌐 <a href="https://www.aroevents.com" target="_blank">www.aroevents.com</a></li>
              <li>🔗 <a href="https://www.linkedin.com/company/aro-events" target="_blank">LinkedIn</a></li>
              <li>📸 <a href="https://www.instagram.com/aro_events_" target="_blank">@aro_events_</a></li>
              <li>📘 <a href="https://www.facebook.com/aroevents" target="_blank">Facebook</a></li>
              <li>🐦 <a href="https://twitter.com/AroEvents" target="_blank">@AroEvents</a></li>
            </ul>
            <p style="margin-top:20px;">We’re excited to connect with you and will be in touch shortly.</p>
            <p style="font-weight:bold;">Best regards,<br/>The ARO Events Team</p>
          </div>
        </div>
      `,
    };

    // Mail to admin
    const adminMailOptions = {
      from: `"Supply Chain AI Conference" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "New Sponsor Submission",
      html: `
        <h2>New Sponsor Submission</h2>
        <p><b>First Name:</b> ${firstName}</p>
        <p><b>Last Name:</b> ${lastName}</p>
        <p><b>Company:</b> ${company}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
      `,
    };

    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);

    res.json({
      success: true,
      message: "Sponsor submission successful! Confirmation email sent.",
    });
  } catch (err) {
    console.error("❌ Error in /supply-fsponsors:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
