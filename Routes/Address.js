const express = require("express");
const {
  defaultRoute,
  addAddress,
  getAddress,
  updateAddress,
  deleteAddress,
} = require("../Controller/Address.js");
const { loginAuthVerify } = require("../Middleware/authVerify.js");
const router = express();

router.get("/", defaultRoute);

// 🔹 Add a new address
router.post("/add", loginAuthVerify, addAddress);

// 🔹 Get all addresses (only non-deleted)
router.get("/list", loginAuthVerify, getAddress);

// 🔹 Update an address
router.put("/update/:addressId", loginAuthVerify, updateAddress);

// 🔹 Soft delete an address (set isDeleted: true)
router.delete("/delete/:addressId", loginAuthVerify, deleteAddress);

module.exports = router;
