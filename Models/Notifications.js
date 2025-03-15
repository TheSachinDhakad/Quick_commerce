const mongoose = require("mongoose");

const NotificationSchema = mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    notification_type: {
      type: String,
      enum: ["profile", "order", "feedback"],
      default: "profile",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
