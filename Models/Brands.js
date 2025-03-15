const mongoose = require("mongoose");
const { Schema } = mongoose;

const brandSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User" },
  category_id: { type: Schema.Types.ObjectId, ref: "Category" },
  name: { type: String, required: true },
  image: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "active", "rejected"],
    default: "pending",
  },
  is_deleted: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Brand", brandSchema);
