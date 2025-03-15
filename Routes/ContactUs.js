const express = require("express");
const router = express.Router();
const {
  defaultRoute,
  createContactUs,
  changeStatus,
  deleteContactUs,
  getContactUsRecords,
} = require("../Controller/ContactUs");
const { loginAuthVerify } = require("../Middleware/authVerify");

router.get("/", defaultRoute);
router.post("/create", createContactUs);
router.put("/change-status", loginAuthVerify, changeStatus);
router.delete("/delete", loginAuthVerify, deleteContactUs);
router.get("/records", loginAuthVerify, getContactUsRecords);

module.exports = router;
