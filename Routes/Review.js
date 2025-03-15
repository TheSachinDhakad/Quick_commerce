const express = require("express");
const {
  addReview,
  verifyReview,
  softDeleteReview,
  restoreReview,
  defaultRoute,
} = require("../Controller/Review");
const { loginAuthVerify } = require("../Middleware/authVerify");

const router = express.Router();

// ✅ Get default route
router.get("/", defaultRoute);

// ✅ Add a review (User)
router.post("/add", loginAuthVerify, addReview);

// ✅ Verify a review (Admin)
router.patch("/:reviewId/verify", loginAuthVerify, verifyReview);

// ✅ Soft delete a review (Admin)
router.delete("/:reviewId/delete", loginAuthVerify, softDeleteReview);

// ✅ Restore a soft-deleted review (Admin)
router.patch("/:reviewId/restore", loginAuthVerify, restoreReview);

module.exports = router;
