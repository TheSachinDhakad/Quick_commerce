// Routes
const express = require("express");
const router = express.Router();
const {
  createPartner,
  getPartners,
  updatePartner,
  deletePartner,
  getPublicPartners,
} = require("../Controller/DeliveryPartner.js");
const { loginAuthVerify } = require("../Middleware/authVerify.js");

router.get("/", getPublicPartners);

router.post("/create", loginAuthVerify, createPartner);
router.get("/records", loginAuthVerify, getPartners);
router.put("/update/:partner_id", loginAuthVerify, updatePartner);
router.delete("/delete/:partner_id", loginAuthVerify, deletePartner);

module.exports = router;
