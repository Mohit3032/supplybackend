const mongoose = require("mongoose");

const SpeakerSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: false, trim: true }, // 🔥 OPTIONAL

  company: { type: String, required: true, trim: true },
  position: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },

  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Speaker", SpeakerSchema);
