const { responseSent, generateOTP } = require("../Helper/responseSent");
const { sendMessage } = require("../Helper/sendSMS.js");
const Notifications = require("../Models/Notifications.js");
const Seller = require("../Models/Seller.js");
const User = require("../Models/User.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Settings = require("../Models/Settings.js");
const { getTimeAgo } = require("../Helper/helper.js");
const {
  sendVerificationEmail,
  sendVerificationEmailResetPassword,
} = require("../Helper/nodemailer.js");
const Order = require("../Models/Order.js");

const defaultRoute = async (req, res) => {
  res.status(200).json({ status: true, message: "Success" });
};

const generateOtpUser = async (req, res) => {
  try {
    let { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !phone) {
      return responseSent(res, false, 400, "Please fill all fields");
    }

    let otp = generateOTP();

    let token = jwt.sign(
      {
        email: email,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        otp,
      },
      process.env.JWT_SECRET_AUTH,
      {
        expiresIn: "1m",
      }
    );

    await sendMessage(`+${phone}`, `Your Binary Threads OTP is ${otp}.`);

    responseSent(res, true, 200, "otp sent successfully", { token, otp });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const verifyOtp = async (req, res) => {
  try {
    let { firstName, lastName, email, phone, otp } = req.auth;
    let { auth_otp } = req.body;

    // Validate input fields
    if (!firstName || !lastName || !phone || !otp || !auth_otp) {
      return responseSent(res, false, 400, "All fields are required."); // Use 400 for bad request
    }

    // Check if OTP matches
    if (otp !== auth_otp) {
      return responseSent(res, false, 400, "Invalid OTP"); // Use 400 for invalid OTP
    }

    let token = jwt.sign(
      {
        email: email || "",
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        isVerified: true,
      },
      process.env.JWT_SECRET_AUTH,
      {
        expiresIn: "1h",
      }
    );

    responseSent(res, true, 200, "otp verified successfully", { token });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const registerUser = async (req, res) => {
  try {
    let { firstName, lastName, email, phone, isVerified } = req.auth; // Extract user data from JWT
    let { password, role } = req.body; // Extract data from request body

    if (!isVerified) {
      return responseSent(res, false, 400, "Please verify your account first");
    }

    // Validate input fields
    if (!firstName || !lastName || !phone || !password) {
      return responseSent(res, false, 400, "All fields are required."); // Use 400 for bad request
    }

    if (role === "admin") {
      let admin = await User.findOne({ role: "admin" });
      if (admin) {
        return responseSent(res, false, 409, "Admin already exists");
      }
    }

    // Check if the user already exists in the database
    let query = { phone: phone }; // Phone is mandatory

    if (email) {
      query.$or = [{ email: email }, { phone: phone }];
    }

    let user = await User.findOne(query);

    if (user) {
      return responseSent(res, false, 409, "User already exists"); // Use 409 for conflict (user exists)
    }

    let userPayload = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      accountActive: true,
      phone_verified: true,
      role,
      password: await bcrypt.hash(password, 10),
    };

    if (role === "seller") {
      userPayload.accountActive = false;
    }

    // Create the new user
    let created_user = await User.create(userPayload);
    let setting = await Settings.create({ user_id: created_user._id });
    created_user.setting = setting._id;
    await created_user.save();
    let sellerAccount = {};
    if (role === "seller") {
      sellerAccount = await Seller.create({
        user_id: created_user._id,
      });
      created_user.seller_account = sellerAccount._id;
      await created_user.save();
    }

    // Generate JWT token for the new user
    let token = jwt.sign(
      { userId: created_user._id, role: created_user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d", // 1 day expiration for the token
      }
    );

    let emailToken = jwt.sign(
      {
        userId: created_user._id,
        role: created_user.role,
        action: "email-verify",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m", // 10 minutes expiration for the token
      }
    );

    if (created_user.email) {
      sendVerificationEmail(email, `email-verify?token=${emailToken}`);
    }

    // Send response back with user info and token
    responseSent(res, true, 200, "User registered successfully", {
      userRole: created_user.role,
      token,
      user: created_user,
      seller_account: sellerAccount,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message); // Handle any server errors
  }
};

const reqForEmailVerify = async (req, res) => {
  try {
    let { userId, role: userRole } = req.auth;

    if (!userId || !userRole) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    let created_user = await User.findById(userId);

    if (!created_user) {
      return responseSent(res, false, 404, "User not found");
    }

    if (created_user.email_verified) {
      return responseSent(res, false, 400, "Email already verified");
    }

    let emailToken = jwt.sign(
      {
        userId: created_user._id,
        role: created_user.role,
        action: "email-verify",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m", // 10 minutes expiration for the token
      }
    );

    if (created_user.email) {
      await sendVerificationEmail(
        created_user.email,
        `email-verify?token=${emailToken}`
      );
    }

    responseSent(res, true, 200, "Email verification link sent successfully", {
      userRole: created_user.role,
    });
  } catch (error) {
    console.error(error);
    responseSent(res, false, 500, "Internal server error");
  }
};

const reqForPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return responseSent(res, false, 400, "Please enter your email address");

    const user = await User.findOne({ email });
    if (!user) return responseSent(res, false, 404, "User not found");

    const emailToken = jwt.sign(
      { userId: user._id, role: user.role, action: "password-reset" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    await sendVerificationEmailResetPassword(
      user.email,
      `password-reset?token=${emailToken}`
    );
    responseSent(res, true, 200, "Password reset link sent to your email.");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const updateUserPasswordUsingReset = async (req, res) => {
  try {
    const { userId, action } = req.auth;
    const { new_password, confirm_password } = req.body;

    if (!userId || action !== "password-reset")
      return responseSent(res, false, 403, "Invalid or unauthorized request");

    if (!new_password || new_password !== confirm_password)
      return responseSent(
        res,
        false,
        400,
        "Passwords do not match or are missing"
      );

    const user = await User.findById(userId);
    if (!user) return responseSent(res, false, 404, "User not found");
    if (user.adminBlocked)
      return responseSent(res, false, 403, "Your account has been blocked");

    user.password = await bcrypt.hash(new_password, 10);
    await user.save();

    await Notifications.create({
      user_id: userId,
      title: "Password Reset Successfully",
      description: "Your password has been updated successfully.",
      notification_type: "profile",
    });

    responseSent(res, true, 200, "Password reset successfully.");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const verifyEmail = async (req, res) => {
  try {
    let { userId, userRole, action } = req.auth;
    if (action === "email-verify") {
      let user = await User.findById(userId);
      if (user) {
        user.email_verified = true;
        await user.save();
        return responseSent(res, true, 200, "Email verified successfully");
      }
    }
    return responseSent(res, false, 400, "Invalid action");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const loginUser = async (req, res) => {
  try {
    let { email, phone, password } = req.body;

    // Validate input
    if (!email && !phone) {
      return responseSent(res, false, 400, "Email or phone is required");
    }

    // If email and password are provided (Login using Email & Password)
    if (email) {
      if (!password) {
        return responseSent(
          res,
          false,
          400,
          "Password is required for email login"
        );
      }

      let user = await User.findOne({
        email: email,
        accountActive: true,
        adminBlocked: false,
      });

      if (!user) {
        return responseSent(res, false, 404, "User not found");
      }

      if (!user.email_verified) {
        return responseSent(
          res,
          false,
          401,
          "Email not verified. Please login using phone number."
        );
      }

      let isPasswordMatch = await bcrypt.compare(password, user.password);

      if (!isPasswordMatch) {
        return responseSent(res, false, 401, "Invalid credentials");
      }

      let seller_account = {};

      if (user.role === "seller") {
        seller_account = await Seller.findById(user.seller_account);
      }

      let token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );

      return responseSent(res, true, 200, "User logged in successfully", {
        role: user.role,
        token,
        user,
        seller_account,
      });
    }

    // If phone number is provided (Login using OTP)
    if (phone) {
      let user = await User.findOne({ phone: phone, accountActive: true });

      if (!user) {
        return responseSent(res, false, 404, "User not found");
      }

      let otp = generateOTP();

      let msgRes = await sendMessage(
        `+${phone}`,
        `Your Binary Threads OTP is ${otp}.`
      );

      let token = jwt.sign(
        {
          userId: user._id,
          otp,
          userRole: user.role,
        },
        process.env.JWT_SECRET_AUTH,
        {
          expiresIn: "1m",
        }
      );

      if (!msgRes) return responseSent(res, false, 500, "Failed to send OTP");

      return responseSent(res, true, 200, "OTP sent successfully", {
        token,
        otp,
      });
    }
  } catch (error) {
    return responseSent(res, false, 500, error.message); // Handle any server errors
  }
};

const verifyLoginOtp = async (req, res) => {
  try {
    let { userId, userRole, otp } = req.auth;
    let { auth_otp } = req.body;

    if (auth_otp !== otp) {
      return responseSent(res, false, 400, "Invalid OTP");
    }
    // If OTP is valid, generate a new JWT token with user ID and return it
    let token = jwt.sign({ userId, role: userRole }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    let user = await User.findById(userId);

    let seller_account = {};
    if (user.role === "seller") {
      seller_account = await Seller.findById(user.seller_account);
    }

    return responseSent(res, true, 200, "OTP verified successfully", {
      role: userRole,
      token,
      user,
      seller_account,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const getProfile = async (req, res) => {
  try {
    let { userId } = req.auth;
    let user = await User.findById(userId).populate("setting");
    let seller_account = {};
    if (user.role === "seller") {
      seller_account = await Seller.findById(user.seller_account);
    }
    let token = jwt.sign({ userId, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    if (!user) {
      return responseSent(res, false, 404, "User not found");
    }
    responseSent(res, true, 200, "User profile retrieved successfully", {
      userRole: user.role,
      user,
      seller_account,
      token,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const updateUserProfile = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { firstName, lastName, email, image } = req.body;

    if (!userId || !role) {
      return responseSent(res, false, 403, "Access denied");
    }

    let user = await User.findById(userId);

    if (!user) {
      return responseSent(res, false, 404, "User not found.");
    }

    // Update only if new values are provided
    if (firstName) user.first_name = firstName;
    if (lastName) user.last_name = lastName;

    if (email && user.email !== email) {
      let existingUser = await User.findOne({ email });
      if (existingUser) {
        return responseSent(res, false, 400, "Email already exists.");
      }
      user.email_verified = false;
      user.email = email;
    }

    if (image) user.image = image;

    await user.save();

    await Notifications.create({
      user_id: userId,
      title: "Profile Updated Successfully",
      description: "Your Profile has been updated successfully.",
      notification_type: "profile",
    });

    return responseSent(res, true, 200, "User profile updated successfully.");
  } catch (error) {
    return responseSent(res, false, 500, error.message);
  }
};

const updateUserPassword = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { password, new_password, confirm_password } = req.body;

    if (!userId || !role) {
      return responseSent(res, false, 403, "Access denied");
    }

    if (!password || !new_password || !confirm_password) {
      return responseSent(res, false, 400, "All password fields are required.");
    }

    if (new_password !== confirm_password) {
      return responseSent(
        res,
        false,
        400,
        "New password and confirm password must be the same."
      );
    }

    let user = await User.findById(userId);

    if (!user) {
      return responseSent(res, false, 404, "User not found");
    }

    if (user.adminBlocked) {
      return responseSent(
        res,
        false,
        403,
        "Your account has been blocked by the admin."
      );
    }

    let isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return responseSent(res, false, 401, "Invalid current password.");
    }

    let encPassword = await bcrypt.hash(new_password, 10);
    user.password = encPassword;
    await user.save();

    // Create a notification for password update
    await Notifications.create({
      user_id: userId,
      title: "Password Updated Successfully",
      description: "Your password has been updated successfully.",
      notification_type: "profile",
    });

    responseSent(res, true, 200, "Password Updated Successfully.");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const updateSettings = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let {
      two_factor_auth,
      email_notification,
      whatsapp_update,
      promotion_email,
    } = req.body;

    if (!userId || !role) {
      return responseSent(res, false, 403, "Access denied");
    }

    let setting = await Settings.findOne({ user_id: userId });

    if (!setting) {
      return responseSent(res, false, 404, "Configuration not available.");
    }

    // Ensure only defined values are updated
    if (typeof two_factor_auth !== "undefined")
      setting.two_factor_auth = two_factor_auth;
    if (typeof email_notification !== "undefined")
      setting.email_notification = email_notification;
    if (typeof whatsapp_update !== "undefined")
      setting.whatsapp_update = whatsapp_update;
    if (typeof promotion_email !== "undefined")
      setting.promotion_email = promotion_email;

    await setting.save();

    // Create notification for setting update
    await Notifications.create({
      user_id: userId,
      title: "Account Setting Updated Successfully",
      description: "Your account settings have been updated successfully.",
      notification_type: "profile",
    });

    responseSent(res, true, 200, "Settings Updated Successfully.", { setting });
  } catch (error) {
    return responseSent(res, false, 500, error.message);
  }
};

const getAllNotifications = async (req, res) => {
  try {
    let { userId, role } = req.auth;

    if (!userId || !role) {
      return responseSent(res, false, 403, "Access denied");
    }

    // Fetch notifications for the user, sorted by latest
    let notifications = await Notifications.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .lean();

    // Format timestamps
    notifications = notifications.map((notification) => ({
      ...notification,
      timeAgo: getTimeAgo(notification.createdAt), // e.g., "5 min ago"
    }));

    responseSent(res, true, 200, "Notifications fetched successfully.", {
      notifications,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const getAllUsers = async (req, res) => {
  try {
    let { userId, role } = req.auth;

    // Access control: Only admin can access
    if (role !== "admin" || !userId) {
      return responseSent(res, false, 403, "Access denied");
    }

    // Extract filters from query parameters
    let {
      role: userRole,
      search,
      adminBlocked,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    let filter = {};

    // Role filter (only fetch users with role=user)
    if (userRole) {
      filter.role = userRole;
    }

    // Status filter (adminBlocked true/false)
    if (adminBlocked !== undefined) {
      filter.adminBlocked = adminBlocked === "true"; // Convert to boolean
    }

    // Search filter (matches first_name, last_name, email, or phone)
    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination calculations
    page = parseInt(page);
    limit = parseInt(limit);
    let skip = (page - 1) * limit;

    // Sorting (default: latest created users)
    let sortOrder = order === "asc" ? 1 : -1;

    // Fetch users with applied filters
    let users = await User.find(filter)
      .select(
        "first_name last_name email phone accountActive adminBlocked email_verified phone_verified"
      ) // Exclude password field
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    // Count total documents for pagination
    let totalUsers = await User.countDocuments(filter);

    responseSent(res, true, 200, "Users fetched successfully", {
      users,
      limit,
      currentPage: page,
      totalRecords: totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const blockUser = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { user_id: targetUserId } = req.query;

    // Access control: Only admin can access
    if (role !== "admin" || !userId) {
      return responseSent(res, false, 403, "Access denied");
    }

    if (!targetUserId) {
      return responseSent(res, false, 400, "User ID is required.");
    }

    let user = await User.findById(targetUserId);
    if (!user) {
      return responseSent(res, false, 404, "User not found.");
    }

    user.adminBlocked = !user.adminBlocked;
    await user.save();

    responseSent(
      res,
      true,
      200,
      user.adminBlocked
        ? "User blocked successfully."
        : "User unblocked successfully."
    );
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const addItemToCart = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { productId, quantity, size, color } = req.body;

    if (!productId || !quantity || !size || !color) {
      return responseSent(
        res,
        false,
        400,
        "Product ID, quantity, color, and size are required."
      );
    }

    if (role !== "user") {
      return responseSent(res, false, 401, "Unauthorized.");
    }

    let user = await User.findById(userId);
    if (!user) {
      return responseSent(res, false, 404, "User not found.");
    }

    // Check if the cart already has 10 items
    if (user.cart.length >= 10) {
      return responseSent(
        res,
        false,
        400,
        "You have reached the maximum cart limit of 10 items."
      );
    }

    // Check if product with the same size and color already exists in the cart
    let existingItem = user.cart.find(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingItem) {
      existingItem.quantity += quantity; // Increase quantity if item exists
    } else {
      user.cart.push({ productId, quantity, size, color }); // Add new item
    }

    await user.save();

    responseSent(res, true, 200, "Item added to cart successfully.", {
      cartData: user.cart,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Remove Item from Cart
const removeItemFromCart = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { productId, size } = req.body; // Add size here

    if (!productId || !size) {
      return responseSent(res, false, 400, "Product ID and size are required.");
    }

    if (role !== "user") {
      return responseSent(res, false, 401, "Unauthorized.");
    }

    let user = await User.findById(userId);
    if (!user) {
      return responseSent(res, false, 404, "User not found.");
    }

    // Remove item from cart with the same size
    user.cart = user.cart.filter(
      (item) => item.productId.toString() !== productId || item.size !== size
    );
    await user.save();

    responseSent(res, true, 200, "Item removed from cart successfully.", {
      cartData: user.cart,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Update Item Quantity in Cart
const updateCartQuantity = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let {
      productId,
      quantity,
      changeQuantity,
      size,
      color,
      newSize,
      newColor,
    } = req.body;
    // `newSize` and `newColor` allow modifying the existing item's attributes.

    if (
      !productId ||
      (quantity === undefined && changeQuantity === undefined) ||
      !size ||
      !color
    ) {
      return responseSent(
        res,
        false,
        400,
        "Product ID, quantity (or changeQuantity), color, and size are required."
      );
    }

    if (role !== "user") {
      return responseSent(res, false, 401, "Unauthorized.");
    }

    let user = await User.findById(userId);
    if (!user) {
      return responseSent(res, false, 404, "User not found.");
    }

    let itemIndex = user.cart.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (itemIndex === -1) {
      return responseSent(res, false, 404, "Item not found in cart.");
    }

    let item = user.cart[itemIndex];

    // Update quantity if provided
    if (quantity !== undefined) {
      if (quantity <= 0) {
        // Remove the item if quantity is 0 or less
        user.cart.splice(itemIndex, 1);
      } else {
        item.quantity = quantity;
      }
    }
    // Modify quantity using changeQuantity
    else if (changeQuantity !== undefined) {
      item.quantity += changeQuantity;
      console.log(item.quantity);
      if (item.quantity <= 0) {
        user.cart.splice(itemIndex, 1); // Remove the item
      }
    }

    // Modify size and color if newSize or newColor is provided
    if (newSize || newColor) {
      let updatedSize = newSize || item.size;
      let updatedColor = newColor || item.color;

      // Check if a similar item with the new size/color already exists
      let existingItemIndex = user.cart.findIndex(
        (cartItem) =>
          cartItem.productId.toString() === productId &&
          cartItem.size === updatedSize &&
          cartItem.color === updatedColor
      );

      if (existingItemIndex !== -1) {
        // Merge quantities if the updated size/color item already exists
        user.cart[existingItemIndex].quantity += item.quantity;
        user.cart.splice(itemIndex, 1); // Remove the old item
      } else {
        // Update item size and color
        item.size = updatedSize;
        item.color = updatedColor;
      }
    }

    await user.save();

    responseSent(res, true, 200, "Cart updated successfully.", {
      cartData: user.cart,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Get All Items in Cart
const getAllCartItems = async (req, res) => {
  try {
    let { userId, role } = req.auth;

    if (role !== "user") {
      return responseSent(res, false, 401, "Unauthorized.");
    }

    let user = await User.findById(userId).populate({
      path: "cart.productId",
      populate: [
        { path: "category", select: "uri name _id" },
        { path: "subcategory", select: "uri name _id" },
      ],
    });

    if (!user) {
      return responseSent(res, false, 404, "User not found.");
    }

    let cartProductIds = user.cart.map((item) => item.productId._id);

    // Fetch total ordered quantity per color and size from orders
    let orderData = await Order.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          "items.product": { $in: cartProductIds },
          status: { $ne: "cancelled" },
          $or: [
            { paymentMethod: { $ne: "online" } },
            {
              $and: [
                { paymentMethod: "online" },
                { status: { $ne: "pending" } },
              ],
            },
          ],
        },
      },
      {
        $group: {
          _id: {
            product: "$items.product",
            color: "$items.color",
            size: "$items.size",
          },
          totalOrdered: { $sum: "$items.quantity" },
        },
      },
    ]);

    let orderMap = {};
    orderData.forEach((order) => {
      let key = `${order._id.product}-${order._id.color}-${order._id.size}`;
      orderMap[key] = order.totalOrdered;
    });

    // Update stock details in cart items
    let updatedCart = user.cart.map((cartItem) => {
      let product = cartItem.productId;
      let updatedStock = product.stock.map((item) => {
        let key = `${product._id}-${item.color}-${item.size}`;
        let orderedQty = orderMap[key] || 0;
        let availableQuantity = item.quantity - orderedQty;
        let stockTag =
          availableQuantity <= 0
            ? "Out of Stock"
            : availableQuantity <= 10
            ? "Limited Stock"
            : "In Stock";

        return {
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          availableQuantity,
          stockTag,
        };
      });

      return {
        ...cartItem.toObject(),
        productId: { ...product.toObject(), stock: updatedStock },
      };
    });

    responseSent(res, true, 200, "Cart items fetched successfully.", {
      cartData: updatedCart,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Add or remove favorite
const toggleFavorite = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { productId, quantity, size, color } = req.body;

    if (!productId || !quantity || !size || !color) {
      return responseSent(
        res,
        false,
        400,
        "Product ID, quantity, color, and size are required."
      );
    }

    if (role !== "user") {
      return responseSent(res, false, 401, "Unauthorized.");
    }

    let user = await User.findById(userId);
    if (!user) {
      return responseSent(res, false, 404, "User not found.");
    }

    let existingItemIndex = user.favorites.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingItemIndex !== -1) {
      // Remove from favorites
      user.favorites.splice(existingItemIndex, 1);
      await user.save();
      return responseSent(res, true, 200, "Item removed from favorites.");
    } else {
      // Add to favorites
      user.favorites.push({ productId, quantity, size, color });
      await user.save();
      return responseSent(res, true, 200, "Item added to favorites.", {
        favorites: user.favorites,
      });
    }
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Move favorite item to cart
const moveFavoriteToCart = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { productId, quantity, size, color } = req.body;

    if (!productId || !quantity || !size || !color) {
      return responseSent(
        res,
        false,
        400,
        "Product ID, quantity, color, and size are required."
      );
    }

    if (role !== "user") {
      return responseSent(res, false, 401, "Unauthorized.");
    }

    let user = await User.findById(userId);
    if (!user) {
      return responseSent(res, false, 404, "User not found.");
    }

    let favoriteIndex = user.favorites.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (favoriteIndex === -1) {
      return responseSent(res, false, 404, "Item not found in favorites.");
    }

    let favoriteItem = user.favorites[favoriteIndex];
    user.favorites.splice(favoriteIndex, 1); // Remove from favorites

    let existingCartItem = user.cart.find(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
    } else {
      user.cart.push(favoriteItem);
    }

    await user.save();

    responseSent(res, true, 200, "Item moved to cart successfully.", {
      cart: user.cart,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Get all favorite items
const getAllFavorites = async (req, res) => {
  try {
    let { userId, role } = req.auth;

    if (role !== "user") {
      return responseSent(res, false, 401, "Unauthorized.");
    }

    let user = await User.findById(userId).populate({
      path: "favorites.productId",
      populate: [
        { path: "category", select: "uri name _id" },
        { path: "subcategory", select: "uri name _id" },
      ],
    });

    if (!user) {
      return responseSent(res, false, 404, "User not found.");
    }

    responseSent(res, true, 200, "Favorites retrieved successfully.", {
      favorites: user.favorites,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

module.exports = {
  defaultRoute,
  generateOtpUser,
  registerUser,
  verifyOtp,
  verifyEmail,
  reqForEmailVerify,
  reqForPasswordReset,
  updateUserPasswordUsingReset,
  loginUser,
  verifyLoginOtp,
  getProfile,
  getAllNotifications,
  updateUserProfile,
  updateUserPassword,
  updateSettings,
  blockUser,
  getAllUsers,

  // Cart
  addItemToCart,
  removeItemFromCart,
  getAllCartItems,
  updateCartQuantity,

  // Favorites
  toggleFavorite,
  moveFavoriteToCart,
  getAllFavorites,
};
