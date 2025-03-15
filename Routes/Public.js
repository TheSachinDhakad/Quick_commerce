const express = require("express");
const { defaultRoute, addressAutoComplete, getAddressFromLatLong, getDistanceMatrix } = require("../Controller/Public");
const router = express();

router.get("/", defaultRoute);
router.get("/public-address", addressAutoComplete);
router.get("/address-lat-long", getAddressFromLatLong);
router.get("/get-distance", getDistanceMatrix);

module.exports = router;
