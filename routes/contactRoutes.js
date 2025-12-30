const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const path = require("path");
const Contact = require("../models/Contact");

// 🚀 POST /api/fcontacts
router.post("/supply-fcontacts", async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    // Prevent duplicate submissions
    const existing = await Contact.findOne({ email, message });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Message has already been sent",
      });
    }

    // Save to database
    await Contact.create({ name, email, subject, message });

    // Mail transporter
 // Mail transporter for Outlook / Office 365
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // TLS is upgraded automatically
  auth: {
    user: process.env.EMAIL_USER, // your Outlook email
    pass: process.env.EMAIL_PASS, // your Outlook mailbox password OR app password
  },
});


    // ✅ Path to brochure
    const brochurePath = path.join(__dirname, "../assets/brochure1.pdf");

    // Mail to user (with brochure)
    const userMailOptions = {
      from: `"ARO Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Thanks for Reaching Out to ARO Events",
      html: `
        <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6;">
          <div style="background:#1d2163; padding:15px; text-align:center; color:#fff; border-radius:6px 6px 0 0;">
            <h2 style="margin:0;">🤝 Thanks for Contacting ARO Events</h2>
          </div>
          <div style="padding:20px; background:#f9f9f9; border:1px solid #ddd; border-top:none; border-radius:0 0 6px 6px;">
            <p>Hi <b>${name || "there"}</b>,</p>
            <p>Thanks for contacting <b>ARO Events</b>! We’ve received your message and our team will get back to you soon.</p>
            
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
      attachments: [
        {
          filename: "brochure1.pdf",
          path: brochurePath,
        },
      ],
    };

const adminMailOptions = {
  from: `"ARO Events Website" <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_USER, // this is YOUR inbox
  subject: `📩 New Contact Form Submission`,
  html: `
    <div style="font-family: Arial, sans-serif; color:#333;">
      <h2>New Contact Form Submission</h2>
      <hr />
      <p><b>Name:</b> ${name || "N/A"}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Subject:</b> ${subject || "N/A"}</p>
      <p><b>Message:</b></p>
      <p style="background:#f4f4f4; padding:10px; border-radius:4px;">
        ${message}
      </p>
      <hr />
      <small>Sent from ARO Events contact form</small>
    </div>
  `,
};


    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);

    res.json({ success: true, message: "Thanks for contacting us! Brochure sent to your email." });
  } catch (err) {
    console.error("❌ Error in /fcontacts:", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ✅ GET /api/contact-info (Better Admin UI JSON)
router.get("/contact-info", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });

    // Transform data for cleaner admin UI
    const formatted = contacts.map((c) => ({
      id: c._id,
      name: c.name,
      email: c.email,
      subject: c.subject,
      message: c.message,
      date: new Date(c.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    res.json({ success: true, total: formatted.length, contacts: formatted });
  } catch (err) {
    console.error("❌ Error fetching contacts:", err.message);
    res.status(500).json({ success: false, error: "Failed to retrieve contacts" });
  }
});

module.exports = router;
