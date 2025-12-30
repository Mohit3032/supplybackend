const mongoose = require("mongoose");

const sponsorSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  company: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: false, default: "" }, // ✅ OPTIONAL
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Sponsor", sponsorSchema);
