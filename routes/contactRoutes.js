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
  subject: "Thank you for your interest – Supply Chain AI Conference",
  html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial, Helvetica, sans-serif;color:#333;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:30px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto;">

            <tr>
              <td style="font-size:15px;line-height:1.6;">
                Hi <strong>${name}</strong>,
              </td>
            </tr>

            <tr><td style="height:18px;"></td></tr>

            <tr>
              <td style="font-size:15px;line-height:1.6;">
                Thank you for showing your interest in our upcoming
                <strong>SupplyChainAiConference</strong>.
                We are currently working on the conference program and agenda,
                please be patient while we confirm our speaker panel.
              </td>
            </tr>

            <tr><td style="height:18px;"></td></tr>

            <tr>
              <td style="font-size:15px;line-height:1.6;">
                You will receive the agenda to your respective email id once it's ready.
                Meanwhile, please find the attached our drafted agenda for your consideration.
              </td>
            </tr>

            <tr><td style="height:22px;"></td></tr>

            <tr>
              <td style="font-size:15px;line-height:1.6;">
                You can explore our latest event conference agenda, attendee list,
                demographics, attendee job title/roles, visiting companies, etc. from here:<br>
                <a href="https://supplychainaiconference.com"
                   style="color:#1d2163;text-decoration:none;">
                  https://supplychainaiconference.com
                </a>
              </td>
            </tr>

            <tr><td style="height:22px;"></td></tr>

            <tr>
              <td style="font-size:15px;line-height:1.6;">
                If you or someone from your team would like to attend this event,
                please reply to this email and we will share more details with you accordingly!
              </td>
            </tr>

            <tr><td style="height:22px;"></td></tr>

            <tr>
              <td style="font-size:15px;line-height:1.6;">
                Many thanks for registering!
              </td>
            </tr>

            <tr><td style="height:22px;"></td></tr>

            <tr>
              <td style="font-size:15px;">
                Best wishes,<br>
                <strong>Delegate Support Team</strong><br>
                ARO EVENTS
              </td>
            </tr>

            <tr><td style="height:30px;"></td></tr>

            <tr>
              <td style="font-size:12px;color:#777;border-top:1px solid #e5e5e5;padding-top:12px;">
                This system generated e-mail was sent from
                SupplyChainAiConference
                (<a href="https://supplychainaiconference.com"
                    style="color:#777;text-decoration:none;">
                  https://supplychainaiconference.com
                </a>).
                Hit ‘Reply-All’ to get in touch with us directly!
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
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
