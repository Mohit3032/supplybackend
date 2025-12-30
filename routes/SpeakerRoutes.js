const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const Speaker = require("../models/Speaker");

// POST /supply-fspeakers
router.post("/supply-fspeakers", async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    company,
    position,
    message,
  } = req.body;

  if (!firstName || !lastName || !email || !company || !position || !message) {
    return res.status(400).json({
      success: false,
      error: "All required fields are missing",
    });
  }

  try {
    // Duplicate check
    const existing = await Speaker.findOne({ email });
    if (existing) {
      return res.json({
        success: false,
        error: "Speaker request already submitted",
      });
    }

    // 🔥 SAVE ALL FIELDS
    await Speaker.create({
      firstName,
      lastName,
      email,
      phone,
      company,
      position,
      message,
    });

    // Mail transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // User mail
    const userMailOptions = {
      from: `"ARO Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Thanks for Your Speakership Interest",
      html: `
        <p>Hi ${firstName},</p>
        <p>
          Thank you for your interest in Speakering
          <b>Supply Chain AI Conference</b>.
          Our team will contact you shortly.
        </p>
        <p><b>ARO Events Team</b></p>
      `,
    };

    // 🔥 ADMIN MAIL — FULL DETAILS
    const adminMailOptions = {
      from: `"Supply Chain AI Conference" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "🚨 NEW Speaker LEAD – FULL DETAILS",
      html: `
        <div style="font-family: Arial, sans-serif; color:#333;">
          <h2 style="color:#1d2163;">New Speaker Lead</h2>
          <hr/>

          <p><b>Name:</b> ${firstName} ${lastName}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Phone:</b> ${phone}</p>
          <p><b>Company:</b> ${company || "—"}</p>
          <p><b>Position:</b> ${position || "—"}</p>
          <p><b>Message:</b><br/>${message || "—"}</p>

          <hr/>
          <p><b>Action:</b> Follow up ASAP</p>
        </div>
      `,
    };

    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);

    return res.json({
      success: true,
      message: "Speaker submission successful. Confirmation email sent.",
    });
  } catch (err) {
    console.error("❌ Error in /supply-fspeakers:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
