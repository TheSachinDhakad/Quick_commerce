const { responseSent } = require("../Helper/responseSent");
const Order = require("../Models/Order");
const Product = require("../Models/Product");
const Review = require("../Models/Review");

// ✅ Default Route
const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "Review routes.");
};

// ✅ Add Review for All Products in an Order
const addReview = async (req, res) => {
  try {
    const { userId, role } = req.auth;
    const { orderId, rating, comment } = req.body;

    if (role !== "user") return responseSent(res, false, 401, "Unauthorized.");
    if (!orderId || !rating || !comment)
      return responseSent(res, false, 400, "Please provide all fields.");

    if (rating < 1 || rating > 5)
      return responseSent(res, false, 400, "Rating must be between 1 and 5.");

    // Fetch the order
    const order = await Order.findById(orderId).populate("items.product");
    if (!order) return responseSent(res, false, 404, "Order not found.");

    // Extract product IDs from order items
    const productIds = order.items.map((item) => item.product._id);

    let existingReview = await Review.findOne({ order: orderId });

    if(existingReview) return responseSent(res, false, 400, "Review already exists for this order.");

    // Create a single review applicable to all products
    const review = new Review({
      products: productIds, // Store all product IDs
      user: userId,
      order: orderId,
      rating,
      comment,
      verified: false,
      isDeleted: false,
    });

    await review.save();

    order.review_id = review._id;
    await order.save();

    // Update all products by adding the review ID
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $push: { reviews: review._id } }
    );

    responseSent(res, true, 200, "Review added successfully.");
  } catch (error) {
    responseSent(res, false, 500, "Server Error. Please try again later.");
  }
};

// ✅ Verify Review (Admin)
const verifyReview = async (req, res) => {
  try {
    const { userId, role } = req.auth;
    const reviewId = req.params.reviewId;

    if (role !== "admin") return responseSent(res, false, 401, "Unauthorized.");

    const review = await Review.findById(reviewId);
    if (!review) return responseSent(res, false, 404, "Review not found.");

    // Mark review as verified
    review.verified = true;
    await review.save();

    // Update ratings for all associated products
    await updateProductRatings(review.products);

    responseSent(res, true, 200, "Review verified & product ratings updated.");
  } catch (error) {
    responseSent(res, false, 500, "Server Error. Please try again later.");
  }
};

// ✅ Soft Delete Review
const softDeleteReview = async (req, res) => {
  try {
    const { userId, role } = req.auth;
    const reviewId = req.params.reviewId;

    if (role !== "admin") return responseSent(res, false, 401, "Unauthorized.");

    const review = await Review.findById(reviewId);
    if (!review) return responseSent(res, false, 404, "Review not found.");

    review.isDeleted = true;
    await review.save();

    // Update ratings for all associated products
    await updateProductRatings(review.products);

    responseSent(res, true, 200, "Review deleted successfully.");
  } catch (error) {
    responseSent(res, false, 500, "Server Error. Please try again later.");
  }
};

// ✅ Restore Soft Deleted Review
const restoreReview = async (req, res) => {
  try {
    const { userId, role } = req.auth;
    const reviewId = req.params.reviewId;

    if (role !== "admin" || !userId) return responseSent(res, false, 401, "Unauthorized.");

    const review = await Review.findById(reviewId);
    if (!review) return responseSent(res, false, 404, "Review not found.");

    review.isDeleted = false;
    await review.save();

    // Update ratings for all associated products
    await updateProductRatings(review.products);

    responseSent(res, true, 200, "Review restored successfully.");
  } catch (error) {
    responseSent(res, false, 500, "Server Error. Please try again later.");
  }
};

// ✅ Function to Update Product Ratings
const updateProductRatings = async (productIds) => {
  try {
    for (const productId of productIds) {
      const product = await Product.findById(productId);
      if (!product) continue;

      // Get all verified & non-deleted reviews for this product
      const verifiedReviews = await Review.find({
        products: productId,
        verified: true,
        isDeleted: false,
      });

      // Calculate new average rating
      const totalRating = verifiedReviews.reduce(
        (sum, rev) => sum + rev.rating,
        0
      );
      product.ratings.average = verifiedReviews.length
        ? totalRating / verifiedReviews.length
        : 0;
      product.ratings.totalReviews = verifiedReviews.length;

      await product.save();
    }
  } catch (error) {
    console.error("Error updating product ratings:", error.message);
  }
};

module.exports = {
  defaultRoute,
  addReview,
  verifyReview,
  softDeleteReview,
  restoreReview,
};
