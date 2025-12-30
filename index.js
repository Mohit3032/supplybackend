const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
// const nodemailer = require("nodemailer");

// ✅ Import routes
const contactRoutes = require("./routes/contactRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const razorpayRoute = require("./routes/razorpayRoutes");
const paypalRoute = require("./routes/paypalRoutes");
const speakerRoutes = require("./routes/SpeakerRoutes");
const sponsorRoutes = require("./routes/SponsorRoutes");
const subscribeRoutes = require("./routes/SubscribeRoutes"); // Added subscribe route

const app = express();

// ✅ Middleware: CORS
const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || ["*"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow mobile apps or curl
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `CORS policy: origin ${origin} not allowed`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Middleware: Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Routes
app.use("/api", contactRoutes);
app.use("/api", bookingRoutes);
app.use("/api", speakerRoutes);
app.use("/api", sponsorRoutes);
app.use("/api/payment/razorpay", razorpayRoute);
app.use("/api/payment/paypal", paypalRoute);
app.use("/api", subscribeRoutes); // Added subscribe route

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 API is running...");
});

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

// ✅ Start server
const PORT = process.env.PORT || 1010;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
