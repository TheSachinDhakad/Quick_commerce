const express = require("express");
const router = express.Router();
const {
  defaultRoute,
  generateOtpUser,
  registerUser,
  verifyOtp,
  loginUser,
  verifyLoginOtp,
  getProfile,
  addItemToCart,
  removeItemFromCart,
  updateCartQuantity,
  getAllCartItems,
  getAllUsers,
  blockUser,
  updateUserProfile,
  updateUserPassword,
  updateSettings,
  getAllNotifications,
  verifyEmail,
  reqForEmailVerify,
  reqForPasswordReset,
  updateUserPasswordUsingReset,
  toggleFavorite,
  moveFavoriteToCart,
  getAllFavorites,
} = require("../Controller/User.js");
const {
  verifyAuthToken,
  loginAuthVerify,
} = require("../Middleware/authVerify.js");

router.get("/", defaultRoute);

// signup 3 steps
router.post("/otp", generateOtpUser); // generate otp
router.post("/password-reset", reqForPasswordReset);
router.post("/otp/verify", verifyAuthToken, verifyOtp);
router.post("/sign-up", verifyAuthToken, registerUser);

// login 2 steps by email or phone
router.post("/sign-in", loginUser); // send otp
router.post("/sign-in/verify", loginAuthVerify, verifyLoginOtp);
router.get("/email/verify", loginAuthVerify, verifyEmail);
router.get("/req-email/verify", loginAuthVerify, reqForEmailVerify);
router.post("/password/reset/confirm", loginAuthVerify, updateUserPasswordUsingReset);

//  profile
router.get("/profile", loginAuthVerify, getProfile);
router.get("/profiles", loginAuthVerify, getAllUsers);
router.put("/block", loginAuthVerify, blockUser);
router.get("/notifications", loginAuthVerify, getAllNotifications);
router.put("/profile/update", loginAuthVerify, updateUserProfile);
router.put("/password/update", loginAuthVerify, updateUserPassword);
router.put("/setting/update", loginAuthVerify, updateSettings);

// cart
router.post("/cart/add", loginAuthVerify, addItemToCart);
router.post("/cart/remove", loginAuthVerify, removeItemFromCart);
router.post("/cart/update", loginAuthVerify, updateCartQuantity);
router.get("/cart/getAll", loginAuthVerify, getAllCartItems);

//  favorite
router.post("/favorite/toggle", loginAuthVerify, toggleFavorite);
router.post("/favorite/move-to-cart", loginAuthVerify, moveFavoriteToCart);
router.get("/favorite", loginAuthVerify, getAllFavorites);

module.exports = router;
