const mongoose = require("mongoose");

// ✅ Order Schema
const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
  order_id: { type: mongoose.Schema.ObjectId, ref: "Order", required: true },
  rz_order_id: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: { type: String, default: "pending" }, // pending, paid, failed
  paymentId: { type: String, default: null },
  secretKey: { type: String, required: true },
});

const RzOrder = mongoose.model("RzOrder", orderSchema);
module.exports = RzOrder;
