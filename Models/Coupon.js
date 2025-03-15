const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define Coupon Schema
const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    maxUsage: {
      type: Number, // Max number of times the coupon can be used
      required: true,
      default: 0,
    },
    usedCount: {
      type: Number, // Number of times the coupon has been used
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false, // Indicates whether the coupon is deleted or not (soft delete)
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Middleware to check if coupon can be applied (validate usage)
couponSchema.methods.canUse = function () {
  // Coupon is active and not expired, and not yet used the max number of times
  return (
    this.isActive &&
    this.expirationDate > new Date() &&
    this.usedCount < this.maxUsage
  );
};

// Update the used count when the coupon is applied to an order
couponSchema.methods.incrementUsage = async function () {
  if (this.canUse()) {
    this.usedCount += 1;
    await this.save();
    return true;
  } else {
    throw new Error(
      "Coupon cannot be used (either expired or max usage limit reached)"
    );
  }
};

// Model
const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
