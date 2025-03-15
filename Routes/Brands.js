const express = require("express");
const {
  defaultRoute,
  getBrands,
  getPublicBrands,
  createBrand,
  editBrand,
  changeBrandStatus,
  deleteBrand,
} = require("../Controller/Brands");
const { loginAuthVerify } = require("../Middleware/authVerify");
const router = express.Router();

router.get("/", defaultRoute);

// Public Route - Get Brands (With Pagination)
router.get("/public", getPublicBrands);

// Private Routes (Require Authentication)
router.get("/get", loginAuthVerify, getBrands);
router.post("/create", loginAuthVerify, createBrand);
router.put("/edit", loginAuthVerify, editBrand);
router.put("/status", loginAuthVerify, changeBrandStatus); // Only Admin
router.delete("/delete/:brandId", loginAuthVerify, deleteBrand);

module.exports = router;
