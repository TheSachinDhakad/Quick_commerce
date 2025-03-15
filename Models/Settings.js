const mongoose = require("mongoose");

const SettingSchema = mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    two_factor_auth: { type: Boolean, default: false, required: true },
    email_notification: { type: Boolean, default: true, required: true },
    whatsapp_update: { type: Boolean, default: false, required: true },
    promotion_email: { type: Boolean, default: true, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", SettingSchema);
