const { responseSent } = require("../Helper/responseSent");
const axios = require("axios");
const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "public routes.");
};

const addressAutoComplete = async (req, res) => {
  try {
    let { address } = req.query;
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${address}&key=${GOOGLE_API_KEY}`;
    let response = await axios.get(url);
    responseSent(res, true, 200, "data fetched successfully.", {
      google_response: response.data,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Google Reverse Geocoding API to get address from lat/lng and check Lucknow origin
const getAddressFromLatLong = async (req, res) => {
  try {
    let { lat, lng } = req.query;
    if (!lat || !lng) {
      return responseSent(
        res,
        false,
        400,
        "Latitude and Longitude are required."
      );
    }

    let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;

    let response = await axios.get(url);

    if (response.data.status !== "OK") {
      return responseSent(res, false, 400, "Invalid coordinates or API error.");
    }

    let formattedAddress = response.data.results[0].formatted_address;

    // Check if address contains "Lucknow"
    let isLucknowOrigin = response.data.results.some((result) =>
      // result.formatted_address.toLowerCase().includes("lucknow")
      result.formatted_address.toLowerCase().includes("bhopal")
    );

    responseSent(res, true, 200, "Address fetched successfully.", {
      address: formattedAddress,
      isLucknowOrigin,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Reusable function to get lat/lng from address
const getLatLngFromAddress = async (address) => {
  let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${GOOGLE_API_KEY}`;

  let response = await axios.get(url);
  if (response.data.status !== "OK") return null;

  let location = response.data.results[0].geometry.location;
  return {
    lat: location.lat,
    lng: location.lng,
    formatted_address: response.data.results[0].formatted_address,
  };
};

// Function to get distance, time, and check if the origin is Lucknow
const getDistanceMatrix = async (req, res) => {
  try {
    let { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination are required.",
      });
    }

    let originData, destinationData;

    // If the origin is an address, convert to lat/lng
    if (isNaN(origin.split(",")[0])) {
      originData = await getLatLngFromAddress(origin);
      if (!originData)
        return res
          .status(400)
          .json({ success: false, message: "Invalid origin address." });
    } else {
      let [lat, lng] = origin.split(",");
      originData = { lat, lng, formatted_address: `Lat: ${lat}, Lng: ${lng}` };
    }

    // If the destination is an address, convert to lat/lng
    if (isNaN(destination.split(",")[0])) {
      destinationData = await getLatLngFromAddress(destination);
      if (!destinationData)
        return res
          .status(400)
          .json({ success: false, message: "Invalid destination address." });
    } else {
      let [lat, lng] = destination.split(",");
      destinationData = {
        lat,
        lng,
        formatted_address: `Lat: ${lat}, Lng: ${lng}`,
      };
    }

    // Distance Matrix API URL
    let url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originData.lat},${originData.lng}&destinations=${destinationData.lat},${destinationData.lng}&mode=driving&key=${GOOGLE_API_KEY}`;

    let response = await axios.get(url);
    if (response.data.status !== "OK")
      return res.status(400).json({ success: false, message: "API error." });

    let distanceInfo = response.data.rows[0].elements[0];

    if (distanceInfo.status !== "OK") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid route or location." });
    }

    // Check if the origin is in Lucknow
    let isLucknowOrigin = originData.formatted_address
      .toLowerCase()
      .includes("lucknow");

    res.json({
      success: true,
      message: "Distance and time fetched successfully.",
      origin: originData.formatted_address,
      destination: destinationData.formatted_address,
      distance: distanceInfo.distance.text,
      duration: distanceInfo.duration.text,
      isLucknowOrigin,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  defaultRoute,
  addressAutoComplete,
  getAddressFromLatLong,
  getDistanceMatrix,
};
