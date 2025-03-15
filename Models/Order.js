const mongoose = require("mongoose");
const { Schema } = mongoose;
const Coupon = require("./Coupon");

// Address Schema
const addressSchema = new Schema({
  address: {
    type: String,
    required: true,
  },
  lat: {
    type: Number, // Changed from String to Number
    required: true,
  },
  lng: {
    type: Number, // Changed from String to Number
    required: true,
  },
});

// Order Schema
const orderSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  order_id: {
    type: String,
    default: "",
  },
  delivery_partner:{
    type:mongoose.Schema.ObjectId,
    ref:'delivery-partner',
  },
  items: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
      },
      color: {
        type: String,
      },
      size: {
        type: String,
      },
    },
  ],
  final_items: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
      },
      color: {
        type: String,
      },
      size: {
        type: String,
      },
    },
  ],
  coupon: {
    type: Schema.Types.ObjectId,
    ref: "Coupon",
    default: null, // Ensures it's optional
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  discountApplied: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  gstAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "shipped", "delivered", "cancelled", "returned"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["cod", "online", "try-buy"],
    default: "cod",
  },
  payment_id:{
    type:mongoose.Schema.ObjectId,
    ref:"RzOrder",
  },
  review_id: {
    type: mongoose.Schema.ObjectId,
    ref: "Review",
  },
  group_order: {
    type: Boolean,
    default: false,
  },
  cancel_reason: {
    type: String,
    default: "",
  },
  cancel_by: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  address: {
    type: addressSchema,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to apply discount, GST, and set group_order
orderSchema.pre("save", async function (next) {
  try {
    // Calculate total price
    this.totalPrice = this.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    // Apply GST (18% of totalPrice)
    this.gstAmount = parseFloat((this.totalPrice * 0.18).toFixed(2));

    // Reset discount amount before applying coupon
    this.discountAmount = 0;

    // Apply coupon discount if a valid coupon exists
    if (this.coupon) {
      const coupon = await Coupon.findById(this.coupon);
      if (coupon && coupon.canUse()) {
        this.discountAmount = parseFloat(
          ((this.totalPrice * coupon.discount) / 100).toFixed(2)
        );
        // await coupon.incrementUsage();
      } else {
        this.coupon = null; // Remove invalid coupon
      }
    }

    // Calculate final amount after applying GST and discount
    this.finalAmount = parseFloat(
      (this.totalPrice + this.gstAmount - this.discountAmount).toFixed(2)
    );

    // Set group order flag based on items count
    this.group_order = this.items.length > 1;

    next();
  } catch (error) {
    next(error);
  }
});

// Export Order Model
const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
