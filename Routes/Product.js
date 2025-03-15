const express = require("express");
const {
  createProduct,
  defaultRoute,
  getMyProducts,
  getPublicProduct,
  changeProductStatus,
  getPublicProducts,
  updateProduct,
  deleteProduct,
  getPublicProductsFilter,
  getTopSellerItems,
  universalFilter,
} = require("../Controller/productController");
const { loginAuthVerify } = require("../Middleware/authVerify");
const router = express.Router();

router.get("/", defaultRoute);
router.get("/filter", universalFilter);
router.get("/top/seller-items", getTopSellerItems);
router.get("/public", getPublicProduct);
router.get("/public_all", getPublicProducts);
router.get("/public/filter", getPublicProductsFilter);

router.get("/get", loginAuthVerify, getMyProducts);
router.post("/create", loginAuthVerify, createProduct);
router.put("/:product_id", loginAuthVerify, updateProduct);
router.put("/status/change", loginAuthVerify, changeProductStatus);
router.delete("/delete", loginAuthVerify, deleteProduct);

module.exports = router;
