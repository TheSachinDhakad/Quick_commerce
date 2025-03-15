const mongoose = require("mongoose");

const DeliveryPartnerSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    vehicle: { type: String, required: true },
    bike_number: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    img: { type: String, required: true },
    licence_number: { type: String, required: true, unique: true },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("delivery-partner", DeliveryPartnerSchema);
