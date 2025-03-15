const express = require("express");
const router = express.Router();
const couponController = require("../Controller/CouponController.js");

// Create a new coupon
router.post("/", couponController.createCoupon);

// Apply a coupon to an order
router.get("/apply", couponController.applyCoupon);

// Update a coupon
router.put("/:coupon_id", couponController.updateCoupon);

// Soft delete a coupon
router.delete("/:coupon_id", couponController.softDeleteCoupon);

// Get a list of all non-deleted coupons with search and pagination
router.get("/", couponController.getCoupons);

module.exports = router;
