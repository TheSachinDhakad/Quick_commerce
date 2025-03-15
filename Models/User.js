const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: false, unique: true },
  image: { type: String, required: false },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  email_verified: { type: Boolean, default: false },
  phone_verified: { type: Boolean, default: false },
  adminBlocked: { type: Boolean, default: false },
  accountActive: { type: Boolean, default: false },
  role: { type: String, enum: ["admin", "seller", "user"], default: "user" },
  seller_account: { type: Schema.Types.ObjectId, ref: "Seller" },
  cart: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number },
      size: { type: String },
      color: { type: String },
    },
  ],
  favorites: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number },
      size: { type: String },
      color: { type: String },
    },
  ],
  address: [{ type: Schema.Types.ObjectId, ref: "Address" }],
  setting: { type: Schema.Types.ObjectId, ref: "Setting" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
