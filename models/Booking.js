const mongoose = require("mongoose");

// === Delegate schema ===
const DelegateSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  mobile: { type: String, trim: true },
  passType: { type: String, trim: true },
});

// === Sponsorship schema ===
// ✅ Added company field here
const SponsorshipSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  company: { type: String, trim: true }, // ✅ New field
  email: { type: String, required: true, trim: true, lowercase: true },
  package: { type: String, enum: ["Silver", "Gold", "Platinum"], required: true },
});

// === Speaker Pass schema ===
const SpeakerPassSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  company: { type: String, trim: true }, // ✅ Add company here too
  email: { type: String, required: true, trim: true, lowercase: true },
  topic: { type: String, trim: true, default: "" },
  package: { type: String, default: "Speaker Pass", trim: true },
});

// === Booking schema ===
const BookingSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ["pass", "sponsorship", "speakerpass"], 
    default: "pass" 
  },
  delegates: { type: [DelegateSchema], default: undefined },
  sponsorship: { type: SponsorshipSchema, default: null },
  speakerpass: { type: [SpeakerPassSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  currency: { type: String, default: "USD" },
  paymentMethod: { type: String, default: null },
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

// === Pre-save validation ===
BookingSchema.pre("validate", function (next) {
  if (this.type === "pass" && (!this.delegates || this.delegates.length === 0)) {
    this.invalidate("delegates", "At least one delegate is required for a pass booking");
  }
  if (this.type === "speakerpass" && (!this.speakerpass || this.speakerpass.length === 0)) {
    this.invalidate("speakerpass", "At least one speaker is required for a speakerpass booking");
  }
  next();
});

module.exports = mongoose.model("Booking", BookingSchema);
