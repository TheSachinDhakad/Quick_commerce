const mongoose = require("mongoose");
const { Schema } = mongoose;

const DEFAULT_LOCATION = { lat: 28.7041, lng: 77.1025 };

// Seller Schema
const SellerSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User" },
  gender: { type: String, enum: ["male", "female", "other"], default: "male" },
  passportPhoto: { type: String, default: null },
  storeName: { type: String, default: "" },
  gstin: { type: String, default: "" },
  panCard: { type: String, default: "" },
  storeType:{
    type: String,
    enum: ["online", "offline"],
    default: "offline"
  },
  logo: { type: String, default: null },
  banner: { type: String, default: null },
  address: { type: String, default: "" },
  lat: { type: Number, default: DEFAULT_LOCATION.lat },
  lng: { type: Number, default: DEFAULT_LOCATION.lng },
  bankName: { type: String, default: "" },
  accountNumber: { type: String, default: "" },
  ifsc: { type: String, default: "" },
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "active", "rejected"],
  },
  stepCount: { type: Number, default: 1 },
});

const Seller = mongoose.model("Seller", SellerSchema);

module.exports = Seller;
