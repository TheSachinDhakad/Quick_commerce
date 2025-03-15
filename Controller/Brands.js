const { responseSent } = require("../Helper/responseSent");
const Brands = require("../Models/Brands");

const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "Default route");
};

const roleAccess = ["admin", "seller"];

// Create Brand
const createBrand = async (req, res) => {
  try {
    let { name, image, category_id } = req.body;
    let { userId, role } = req.auth;

    if (!roleAccess.includes(role) || !userId) {
      return responseSent(
        res,
        false,
        403,
        "You don't have permission to access this route"
      );
    }

    if (!name || !image || !category_id) {
      return responseSent(res, false, 400, "Please fill all fields");
    }

    let old_brand = await Brands.findOne({ name, category_id });

    if (old_brand) {
      return responseSent(res, false, 400, "Brand already exists");
    }

    let brand = await Brands.create({
      user_id: userId,
      name,
      image,
      category_id,
      status: role === "admin" ? "active" : "pending",
      is_deleted: false,
    });

    return responseSent(res, true, 201, "Brand created successfully", {
      brand,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Get Brands (Admin & Seller)
const getBrands = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { status, page = 1, limit = 10, all, search } = req.query; // Get query params

    let query = { is_deleted: false };

    if (role === "seller") {
      query.user_id = userId; // Seller can only see their own brands
    }

    if (status) {
      // Ensure the status is valid before filtering
      const validStatuses = ["pending", "active", "rejected"];
      if (!validStatuses.includes(status)) {
        return responseSent(res, false, 400, "Invalid status value");
      }
      query.status = status; // Apply status filter
    }

    if (search) {
      query.name = { $regex: search, $options: "i" }; // Case-insensitive search
    }

    if (all === "true") {
      // Return all brands without pagination
      let brands = await Brands.find(query).populate("category_id", "_id name");
      return responseSent(res, true, 200, "All brands fetched successfully", {
        brands,
      });
    }

    // Pagination logic
    page = parseInt(page);
    limit = parseInt(limit);
    let brands = await Brands.find(query)
      .populate("category_id", "_id name")
      .skip((page - 1) * limit)
      .limit(limit);

    let total = await Brands.countDocuments(query);

    return responseSent(
      res,
      true,
      200,
      "Paginated brands fetched successfully",
      {
        brands,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      }
    );
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Public Get Brands (With Pagination)
const getPublicBrands = async (req, res) => {
  try {
    let { page = 1, limit = 10, all, search } = req.query;

    let query = { is_deleted: false, status: "active" };

    // If search query is provided, filter by name (case insensitive)
    if (search) {
      query.name = { $regex: search, $options: "i" }; // Case-insensitive search
    }

    if (all === "true") {
      // Return all brands without pagination
      let brands = await Brands.find({
        is_deleted: false,
        status: "active",
      }).populate("category_id", "_id name");
      return responseSent(res, true, 200, "All brands fetched successfully", {
        brands,
      });
    }

    // Pagination logic
    page = parseInt(page);
    limit = parseInt(limit);
    let brands = await Brands.find(query)
      .populate("category_id", "_id name")
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    let total = await Brands.countDocuments(query);

    return responseSent(
      res,
      true,
      200,
      "Paginated brands fetched successfully",
      {
        brands,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      }
    );
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Edit Brand
const editBrand = async (req, res) => {
  try {
    let { brandId, name, image, category_id } = req.body;
    let { userId, role } = req.auth;

    if (!brandId) {
      return responseSent(res, false, 400, "Brand ID is required");
    }

    let brand = await Brands.findById(brandId);
    if (!brand || brand.is_deleted) {
      return responseSent(res, false, 404, "Brand not found");
    }

    if (role === "seller" && brand.user_id.toString() !== userId) {
      return responseSent(res, false, 403, "You can only edit your own brands");
    }

    brand.name = name || brand.name;
    brand.image = image || brand.image;
    brand.category_id = category_id || brand.category_id;
    await brand.save();

    return responseSent(res, true, 200, "Brand updated successfully", {
      brand,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Change Brand Status (Only Admin)
const changeBrandStatus = async (req, res) => {
  try {
    let { brandId, status } = req.body;
    let { role } = req.auth;

    if (role !== "admin") {
      return responseSent(
        res,
        false,
        403,
        "Only admins can change brand status"
      );
    }

    let brand = await Brands.findById(brandId);
    if (!brand || brand.is_deleted) {
      return responseSent(res, false, 404, "Brand not found");
    }

    if (!["active", "pending", "rejected"].includes(status)) {
      return responseSent(res, false, 400, "Invalid status value");
    }

    brand.status = status;
    await brand.save();

    return responseSent(res, true, 200, "Brand status updated successfully", {
      brand,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// Delete Brand (Soft Delete)
const deleteBrand = async (req, res) => {
  try {
    let { brandId } = req.params;
    let { userId, role } = req.auth;

    if (!brandId) {
      return responseSent(res, false, 400, "Brand ID is required");
    }

    let brand = await Brands.findById(brandId);
    if (!brand || brand.is_deleted) {
      return responseSent(res, false, 404, "Brand not found");
    }

    if (role === "seller" && brand.user_id.toString() !== userId) {
      return responseSent(
        res,
        false,
        403,
        "You can only delete your own brands"
      );
    }

    brand.is_deleted = true;
    await brand.save();

    return responseSent(res, true, 200, "Brand deleted successfully");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

module.exports = {
  defaultRoute,
  createBrand,
  getBrands,
  getPublicBrands,
  editBrand,
  changeBrandStatus,
  deleteBrand,
};
