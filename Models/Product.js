const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema({
  color: { type: String, required: true },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
});

// Schema to store images based on color
const colorImageSchema = new mongoose.Schema({
  color: { type: String, required: true },
  images: {
    type: [String],
    validate: {
      validator: function (arr) {
        return arr.length > 0;
      },
      message: "Each color must have at least one image.",
    },
  },
});

const productSchema = new mongoose.Schema(
  {
    uri: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    short_description: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    brand: { type: String, required: true, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 }, // Discount in percentage
    final_price: { type: Number }, // Auto-calculated price after discount
    colors: [{ type: String }], // Available colors
    colors_images: [colorImageSchema], // Images mapped to colors
    size_type: {
      type: String,
      enum: ["child", "standard", "numeric"],
      default: "standard",
    }, // Available sizes
    size: [{ type: String }], // Available sizes
    fabric: { type: String },
    fit: { type: String },
    pattern: { type: String },
    care_instructions: { type: String },
    images: [{ type: String }], // Array of image URLs
    stock: [stockSchema], // Stock information
    isActive: { type: Boolean, default: true }, // Product status
    isDeleted: { type: Boolean, default: false }, // Product status
    ratings: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
      keywords: [{ type: String }],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Admin/Manager who added the product
  },
  { timestamps: true }
);

// Auto-calculate final price after discount
productSchema.pre("save", function (next) {
  this.final_price = this.price - this.price * (this.discount / 100);
  next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
