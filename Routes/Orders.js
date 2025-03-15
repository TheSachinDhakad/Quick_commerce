const express = require("express");
const { loginAuthVerify } = require("../Middleware/authVerify");
const {
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  defaultRoute,
  cancelOrder,
  deliverTryBuyItems,
  estimateTryBuyCost,
  assignDeliveryPartner,
  getAllSellerOrders,
  getSellerEarnings,
  getAdminEarnings,
} = require("../Controller/orderController.js");
const router = express.Router();

router.get("/", defaultRoute);

// ✅ Create a new order (User Only)
router.post("/create", loginAuthVerify, createOrder);

// ✅ Get user orders (User Only)
router.get("/user-orders", loginAuthVerify, getUserOrders);

// ✅ Get all orders (Admin Only) with Pagination & Filtering
router.get("/all", loginAuthVerify, getAllOrders);

router.get("/seller/all", loginAuthVerify, getAllSellerOrders);

router.get("/seller/earnings", loginAuthVerify, getSellerEarnings);
router.get("/admin/earnings", loginAuthVerify, getAdminEarnings);

// ✅ Update order status (Admin Only)
router.put("/update-status", loginAuthVerify, updateOrderStatus);

router.put("/cancel/:orderId", loginAuthVerify, cancelOrder);

router.post("/deliver-try-buy", loginAuthVerify, deliverTryBuyItems);

router.post("/estimate-try-buy-cost", estimateTryBuyCost);

router.put("/assign", loginAuthVerify, assignDeliveryPartner);

module.exports = router;
