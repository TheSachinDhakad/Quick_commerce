const express = require("express");
const {
  defaultRoute,
  subscribe,
  unsubscribe,
  resubscribe,
} = require("../Controller/Newsletter");
const router = express();

// Default route for newsletter
router.get("/", defaultRoute);

// Subscribe route
router.post("/subscribe", subscribe);

// Unsubscribe route
router.post("/unsubscribe", unsubscribe);

// Resubscribe route
router.post("/resubscribe", resubscribe);

module.exports = router;
