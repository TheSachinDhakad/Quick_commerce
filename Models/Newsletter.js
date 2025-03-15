const mongoose = require("mongoose");
const crypto = require("crypto");

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  unsubscribedAt: {
    type: Date,
    default: null,
  },
  isSubscribed: {
    type: Boolean,
    default: true,
  },
  subscriptionToken: {
    type: String,
    default: () => crypto.randomBytes(32).toString("hex"),
    unique: true,
  },
});

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

module.exports = Newsletter;
