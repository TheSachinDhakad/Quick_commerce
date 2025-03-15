const express = require("express");
const {
  defaultRoute,
  createCategory,
  getCategories,
  editCategory,
  deleteCategory,
  createSubcategory,
  editSubcategory,
  deleteSubcategory,
} = require("../Controller/Category.js");
const { loginAuthVerify } = require("../Middleware/authVerify.js");
const router = express.Router();

router.get("/", defaultRoute);
router.get("/get", getCategories);
// Access only for admin
router.post("/create", loginAuthVerify, createCategory);
router.put("/:category_id", loginAuthVerify, editCategory);
router.delete("/:category_id", loginAuthVerify, deleteCategory);

// sub cat 
router.post("/subcategory/:category_id", loginAuthVerify, createSubcategory);
router.put("/subcategory/:subcategory_id", loginAuthVerify, editSubcategory);
router.delete("/subcategory/:subcategory_id", loginAuthVerify, deleteSubcategory);

module.exports = router;
