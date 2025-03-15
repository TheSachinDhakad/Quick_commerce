const { responseSent } = require("../Helper/responseSent");
const Product = require("../Models/Product");
const Seller = require("../Models/Seller");
const User = require("../Models/User");

const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "seller routes.");
};

const sellerRegistration = async (req, res) => {
  try {
    let {
      firstName = "",
      lastName = "",
      email = "",
      phone = "",
      gender = "",
      storeName = "",
      gstin = "",
      panCard = "",
      storeType = "offline",
      address = "",
      lat = DEFAULT_LOCATION.lat,
      lng = DEFAULT_LOCATION.lng,
      bankName = "",
      accountNumber = "",
      ifsc = "",
      logo = "",
      banner = "",
      passportPhoto = "",
      stepCount = 1,
    } = req.body;
    let { userId, role } = req.auth;
    console.log({ userId, role });

    if (role !== "seller" || !userId) {
      return responseSent(
        res,
        false,
        401,
        "You are not authorized to access this route."
      );
    }

    let user = await User.findById(userId);
    let seller_account = await Seller.findById(user.seller_account);
    if (!user && !seller_account) {
      return responseSent(
        res,
        false,
        404,
        "User and seller account not found."
      );
    }

    if (stepCount === 1) {
      if (
        !firstName ||
        !lastName ||
        !email ||
        !phone ||
        !gender ||
        !passportPhoto
      ) {
        return responseSent(
          res,
          false,
          400,
          "Please fill all fields. in step 1"
        );
      }

      user.first_name = firstName;
      user.last_name = lastName;
      user.email = email;
      user.phone = phone;
      seller_account.gender = gender;
      seller_account.passportPhoto = passportPhoto;
      seller_account.stepCount = 2;
      seller_account.status = "pending";
      await user.save();
      await seller_account.save();
      return responseSent(res, true, 200, "User profile updated successfully", {
        stepCount: 2,
      });
    } else if (stepCount === 2) {
      if (!storeName || !gstin || !panCard || !logo || !banner || !storeType) {
        return responseSent(
          res,
          false,
          400,
          "Please fill all fields. in step 2"
        );
      }

      seller_account.storeName = storeName;
      seller_account.gstin = gstin;
      seller_account.panCard = panCard;
      seller_account.storeType = storeType;
      seller_account.logo = logo;
      seller_account.banner = banner;
      seller_account.stepCount = 3;
      seller_account.status = "pending";
      await seller_account.save();
      return responseSent(res, true, 200, "User profile updated successfully", {
        stepCount: 3,
      });
    } else if (stepCount === 3) {
      if (!address || !lat || !lng) {
        return responseSent(
          res,
          false,
          400,
          "Please fill all fields. in step 3"
        );
      }

      seller_account.address = address;
      seller_account.lat = lat;
      seller_account.lng = lng;
      seller_account.stepCount = 4;
      seller_account.status = "pending";
      await seller_account.save();
      return responseSent(res, true, 200, "User profile updated successfully", {
        stepCount: 4,
      });
    } else if (stepCount === 4) {
      if (!bankName || !accountNumber || !ifsc) {
        return responseSent(
          res,
          false,
          400,
          "Please fill all fields. in step 4"
        );
      }

      seller_account.bankName = bankName;
      seller_account.accountNumber = accountNumber;
      seller_account.ifsc = ifsc;
      seller_account.stepCount = 5;
      seller_account.status = "pending";
      await seller_account.save();
      return responseSent(res, true, 200, "User profile updated successfully", {
        stepCount: 5,
      });
    } else {
      return responseSent(res, false, 400, "Invalid step count.");
    }
  } catch (error) {
    console.log(error);
    responseSent(res, false, 500, error.message);
  }
};

const sellerVerify = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { user_id, status } = req.body;

    const allowedStatus = ["active", "rejected"];

    if (role !== "admin" || !userId) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    if (!user_id || !status || !allowedStatus.includes(status)) {
      return responseSent(res, false, 400, "Please fill all fields. ");
    }

    let user = await User.findById(user_id);
    if (!user) {
      return responseSent(res, false, 404, "Seller account not found");
    }
    let seller_account = await Seller.findById(user.seller_account);

    user.accountActive = true;
    seller_account.status = status;
    seller_account.stepCount = 1;
    await user.save();
    await seller_account.save();
    return responseSent(res, true, 200, "Seller account verified successfully");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const getSellers = async (req, res) => {
  try {
    let { userId, role } = req.auth;

    if (role !== "admin" || !userId) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    let {
      status,
      page = 1,
      limit = 10,
      all,
      search,
      sortOrder = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let filter = { role: "seller" }; // Only fetch sellers

    let sellerAccountFilter = {};

    // Apply status filter
    if (status) {
      sellerAccountFilter.status = status;
    }

    // Search by first name OR last name OR store name
    if (search) {
      filter["$or"] = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
      ];
      // sellerAccountFilter.storeName = { $regex: search, $options: "i" };
    }

    let sortOption = sortOrder === "asc" ? 1 : -1;

    // Fetch sellers along with seller_account and filter out users where seller_account is null
    let sellersQuery = await User.find(filter)
      .select("-password")
      .populate({
        path: "seller_account",
        match: sellerAccountFilter,
      })
      .sort({ createdAt: sortOption });

    // Remove users where seller_account is null (ensures seller_account is required)
    let sellers = sellersQuery.filter((seller) => seller.seller_account);

    let total = sellers.length;

    // Apply pagination manually since we filter after population
    if (!all) {
      sellers = sellers.slice((page - 1) * limit, page * limit);
    }

    return responseSent(res, true, 200, "Sellers retrieved successfully", {
      sellers,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const getPublicSellers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, sortOrder = "desc", all } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    let filter = { role: "seller" };

    // Search by first name, last name, or store name
    if (search) {
      filter["$or"] = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
      ];
    }

    let sortOption = sortOrder === "asc" ? 1 : -1;

    // Fetch sellers with public information
    let query = User.find(filter)
      .select("first_name last_name email createdAt seller_account")
      .populate({
        path: "seller_account",
        match: { status: "active" },
        select: "storeName address banner logo",
      })
      .sort({ createdAt: sortOption });

    // If 'all' is passed, override pagination
    if (!all) {
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const sellers = await query;

    // Filter out users with null seller_account
    const filteredSellers = sellers.filter((seller) => seller.seller_account);

    // Count total approved sellers with non-null seller_account
    const totalRecords = filteredSellers.length;

    return responseSent(
      res,
      true,
      200,
      "Public sellers retrieved successfully",
      {
        sellers: filteredSellers,
        page: all ? 1 : page,
        limit: all ? totalRecords : limit,
        totalPages: all ? 1 : Math.ceil(totalRecords / limit),
        totalRecords,
      }
    );
  } catch (error) {
    console.error("Error fetching public sellers:", error);
    responseSent(res, false, 500, error.message);
  }
};

const getSellerById = async (req, res) => {
  try {
    // let { userId, role } = req.auth;

    // if (role !== "admin" || !userId) {
    //   return responseSent(res, false, 401, "Unauthorized");
    // }

    let { sellerId } = req.params;

    if (!sellerId) {
      return responseSent(res, false, 400, "Seller ID is required");
    }

    let seller = await User.findById(sellerId).populate("seller_account");

    // If the seller has an online store, set the address to indicate it's a virtual store
    if (seller?.seller_account?.storeType !== "online") {
      seller.seller_account.address =
        "This is a virtual store and available online only.";
    }

    if (!seller) {
      return responseSent(res, false, 404, "Seller not found");
    }
    let seller_products = await Product.find({
      createdBy: sellerId,
      isActive: true,
      isDeleted: false,
    });

    return responseSent(res, true, 200, "Seller retrieved successfully", {
      seller,
      seller_products,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

module.exports = {
  defaultRoute,
  sellerRegistration,
  sellerVerify,
  getSellers,
  getSellerById,
  getPublicSellers,
};
