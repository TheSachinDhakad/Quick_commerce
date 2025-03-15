const express = require("express");
const {
  defaultRoute,
  sellerRegistration,
  sellerVerify,
  getSellers,
  getSellerById,
  getPublicSellers,
} = require("../Controller/Seller");
const { loginAuthVerify } = require("../Middleware/authVerify");
const router = express();

router.get("/", defaultRoute);
router.get("/public", getPublicSellers);
router.post("/update", loginAuthVerify, sellerRegistration);
router.post("/verify", loginAuthVerify, sellerVerify);
router.get("/get", loginAuthVerify, getSellers);
router.get("/get/:sellerId", getSellerById);

module.exports = router;
