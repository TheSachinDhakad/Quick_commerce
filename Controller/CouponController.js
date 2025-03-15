const { responseSent } = require("../Helper/responseSent");
const Coupon = require("../Models/Coupon.js");

// Controller to create a new coupon
exports.createCoupon = async (req, res) => {
  const { code, discount, maxUsage, expirationDate } = req.body;

  // Basic validation
  if (!code || !discount || !maxUsage || !expirationDate) {
    return responseSent(res, false, 400, "Missing required fields");
  }

  try {
    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code, is_deleted: false }); // Exclude deleted coupons
    if (existingCoupon) {
      return responseSent(res, false, 400, "Coupon code already exists");
    }

    // Create new coupon
    const newCoupon = new Coupon({
      code,
      discount,
      maxUsage,
      expirationDate,
      usedCount: 0,
    });

    // Save the coupon to the database
    await newCoupon.save();

    // Respond with success
    return responseSent(
      res,
      true,
      201,
      "Coupon created successfully",
      newCoupon
    );
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

// Controller to apply a coupon to an order
exports.applyCoupon = async (req, res) => {
  const { code: couponCode } = req.query;

  // Basic validation
  if (!couponCode) {
    return responseSent(res, false, 400, "Coupon code is required");
  }

  try {
    // Find the coupon by code and ensure it's not deleted
    const coupon = await Coupon.findOne({
      code: couponCode,
      is_deleted: false,
    });

    // If coupon does not exist or is deleted
    if (!coupon) {
      return responseSent(res, false, 404, "Coupon not found or deleted");
    }

    // Check if the coupon is expired
    if (new Date(coupon.expirationDate) < new Date()) {
      return responseSent(res, false, 400, "Coupon has expired");
    }

    // Check if the coupon can still be used
    if (coupon.usedCount >= coupon.maxUsage) {
      return responseSent(res, false, 400, "Coupon usage limit reached");
    }

    // If the coupon is valid, increment its usage count
    // await coupon.incrementUsage();

    // Respond with the coupon details
    return responseSent(res, true, 200, "Coupon applied successfully", {
      coupon,
    });
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

// Controller to update a coupon
exports.updateCoupon = async (req, res) => {
  const { coupon_id } = req.params;
  const { discount, maxUsage, expirationDate } = req.body;

  // Basic validation
  if (!discount || !maxUsage || !expirationDate) {
    return responseSent(res, false, 400, "Missing required fields");
  }

  try {
    // Find the coupon by ID and check if it's not deleted
    const coupon = await Coupon.findOne({ _id: coupon_id, is_deleted: false });
    if (!coupon) {
      return responseSent(res, false, 404, "Coupon not found or deleted");
    }

    // Update the coupon
    coupon.discount = discount;
    coupon.maxUsage = maxUsage;
    coupon.expirationDate = expirationDate;

    // Save the updated coupon
    await coupon.save();

    // Respond with the updated coupon
    return responseSent(res, true, 200, "Coupon updated successfully", coupon);
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

// Controller to soft delete a coupon (mark it as deleted)
exports.softDeleteCoupon = async (req, res) => {
  const { coupon_id } = req.params;

  try {
    // Find the coupon by ID and check if it's not already deleted
    const coupon = await Coupon.findOne({ _id: coupon_id, is_deleted: false });
    if (!coupon) {
      return responseSent(
        res,
        false,
        404,
        "Coupon not found or already deleted"
      );
    }

    // Mark the coupon as deleted
    coupon.is_deleted = true;

    // Save the updated coupon
    await coupon.save();

    // Respond with success
    return responseSent(res, true, 200, "Coupon deleted successfully");
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

// Controller to get a list of all non-deleted coupons with search and pagination
exports.getCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    // Convert page and limit to numbers
    const currentPage = parseInt(page, 10);
    const perPage = parseInt(limit, 10);

    // Build the search filter if search term is provided
    const searchFilter = search
      ? { code: { $regex: search, $options: "i" }, is_deleted: false } // Case-insensitive search on coupon code
      : { is_deleted: false };

    // Fetch coupons based on search filter and pagination
    const coupons = await Coupon.find(searchFilter)
      .skip((currentPage - 1) * perPage) // Skip records based on current page
      .limit(perPage); // Limit the number of records per page

    // Count total number of non-deleted coupons
    const totalRecords = await Coupon.countDocuments(searchFilter);

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / perPage);

    // If no coupons found
    if (!coupons || coupons.length === 0) {
      return responseSent(res, false, 404, "No coupons found");
    }

    // Respond with the list of coupons along with pagination info
    return responseSent(res, true, 200, "Coupons fetched successfully", {
      coupons,
      limit,
      currentPage,
      totalPages,
      totalRecords,
    });
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};
