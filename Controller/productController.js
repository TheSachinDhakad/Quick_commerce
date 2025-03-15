const { generateURL } = require("../Helper/helper");
const { responseSent } = require("../Helper/responseSent");
const Category = require("../Models/Category");
const Order = require("../Models/Order");
const Product = require("../Models/Product");
const Seller = require("../Models/Seller");
const SubCategory = require("../Models/SubCategory");
const User = require("../Models/User");

/**
 * Default route for product controller.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "product routes.");
};

/**
 * Create a new product.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const createProduct = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      title,
      price,
      discount,
      short_description,
      description,
      brand,
      fabric,
      pattern,
      fit,
      care_instructions,
      colors,
      colors_images,
      size_type,
      size,
      stock,
    } = req.body;

    let { userId, role } = req.auth;

    let allowedRoles = ["admin", "seller"];
    let allowedSizeType = ["child", "standard", "numeric"];

    // Check if the user has permission to access this route
    if (!allowedRoles.includes(role) || !userId) {
      return responseSent(
        res,
        false,
        403,
        "You don't have permission to access this route"
      );
    }

    // Check if the seller account is active
    if (role === "seller") {
      let seller = await User.findById(userId).populate("seller_account");

      if (seller.seller_account.status !== "active")
        return responseSent(res, false, 403, "Seller account is not active.");
    }

    // Validate the size type
    if (!allowedSizeType.includes(size_type)) {
      return responseSent(res, false, 403, "Invalid size type");
    }

    // Validate the colors_images
    if (colors.length !== Object.keys(colors_images).length) {
      return res
        .status(400)
        .json({ error: "Each selected color must have at least one image." });
    }

    const formattedColorsImages = Object.keys(colors_images).map((color) => ({
      color,
      images: colors_images[color],
    }));

    let totalLength = colors.length * size.length;
    if (totalLength !== stock.length) {
      return responseSent(res, false, 400, "Invalid stock length");
    }

    stock.forEach((item) => {
      if (!item.quantity) {
        return responseSent(
          res,
          false,
          400,
          "Quantity is required. Please add quantity."
        );
      }
    });

    // Validate the required fields
    if (
      !category ||
      !subcategory ||
      !title ||
      !price ||
      !short_description ||
      !description ||
      !brand ||
      !size_type
    ) {
      return responseSent(res, false, 400, "Required fields are missing.");
    }

    // Validate the colors
    if (!Array.isArray(colors) || colors.length === 0) {
      return responseSent(res, false, 400, "At least one color is required.");
    }

    // Validate the size
    if (!Array.isArray(size) || size.length === 0) {
      return responseSent(res, false, 400, "At least one size is required.");
    }

    // Validate the discount
    if (discount < 0 || discount > 100) {
      return responseSent(
        res,
        false,
        400,
        "Discount must be between 0 and 100."
      );
    }

    // Validate the price
    if (price <= 0) {
      return responseSent(res, false, 400, "Price must be a positive number.");
    }

    // Validate the short description
    const shortDescriptionWords = short_description.split(/\s+/).length;
    if (shortDescriptionWords > 30) {
      return responseSent(
        res,
        false,
        400,
        "Short description cannot exceed 30 words."
      );
    }

    // Validate the description
    const descriptionWords = description.split(/\s+/).length;
    if (descriptionWords > 200) {
      return responseSent(
        res,
        false,
        400,
        "Description cannot exceed 200 words."
      );
    }

    // Create the product
    let productUri = generateURL(title) + "-" + Date.now();

    const product = new Product({
      category,
      subcategory,
      title,
      price,
      discount,
      short_description,
      description,
      brand,
      fabric,
      pattern,
      fit,
      care_instructions,
      colors,
      colors_images: formattedColorsImages,
      size_type,
      size,
      stock,
      uri: productUri,
      isActive: role === "admin",
      createdBy: userId,
    });

    await product.save();
    responseSent(res, true, 201, "Product created successfully", { product });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

// ✅ Allowed Updates
// ✔️ Add new colors
// ✔️ Add new sizes
// ✔️ Increase stock for existing colors/sizes
// ✔️ Update other product details (title, price, discount, etc.)

// ❌ Not Allowed
// ❌ Remove an existing color
// ❌ Remove an existing size
// ❌ Reduce stock (only addition is allowed)

/**
 * Update an existing product.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @returns {Promise<void>}
 */
const updateProduct = async (req, res) => {
  try {
    // Get the product ID from the URL parameter
    const { product_id: productId } = req.params;
    // Get the request body
    const {
      category,
      subcategory,
      title,
      price,
      discount,
      short_description,
      description,
      brand,
      fabric,
      pattern,
      fit,
      care_instructions,
      colors = [],
      colors_images,
      size_type,
      size = [],
      stock = [],
    } = req.body;

    // Get the user ID and role from the auth object
    let { userId, role } = req.auth;
    // Define the allowed roles for this route
    let allowedRoles = ["admin", "seller"];
    // Define the allowed size types
    let allowedSizeType = ["child", "standard", "numeric"];

    // Check if the user has the required permission
    if (!allowedRoles.includes(role) || !userId) {
      return responseSent(
        res,
        false,
        403,
        "You don't have permission to access this route"
      );
    }

    // Check if the seller account is active
    if (role === "seller") {
      let seller = await User.findById(userId).populate("seller_account");
      if (seller.seller_account.status !== "active")
        return responseSent(res, false, 403, "Seller account is not active.");
    }

    // Find the product by ID
    let product = await Product.findById(productId);
    if (!product) {
      return responseSent(res, false, 404, "Product not found");
    }

    // Validate the required fields
    if (
      (!category && !product.category) ||
      (!subcategory && !product.subcategory) ||
      (!title && !product.title) ||
      (!price && !product.price) ||
      (!short_description && !product.short_description) ||
      (!description && !product.description) ||
      (!brand && !product.brand) ||
      (!size_type && !product.size_type)
    ) {
      return responseSent(res, false, 400, "Required fields are missing.");
    }

    // Validate the size type
    if (size_type && !allowedSizeType.includes(size_type)) {
      return responseSent(res, false, 400, "Invalid size type.");
    }

    // Validate the discount
    if (discount !== undefined && (discount < 0 || discount > 100)) {
      return responseSent(
        res,
        false,
        400,
        "Discount must be between 0 and 100."
      );
    }

    // Validate the price
    if (price !== undefined && price <= 0) {
      return responseSent(res, false, 400, "Price must be a positive number.");
    }

    // Ensure colors are provided; if not, use existing product colors
    const newColors = colors.length > 0 ? colors : product.colors;

    // Check if any existing colors are missing in the new colors list
    let removedColors = product.colors.filter((c) => !newColors.includes(c));

    if (removedColors.length > 0) {
      return responseSent(
        res,
        false,
        400,
        `Colors cannot be removed: ${removedColors.join(", ")}`
      );
    }

    // Ensure colors and colors_images match
    if (
      colors &&
      colors_images &&
      colors.length !== Object.keys(colors_images).length
    ) {
      return responseSent(
        res,
        false,
        400,
        "Each selected color must have at least one image."
      );
    }

    let formattedColorsImages = product.colors_images;
    if (colors_images) {
      formattedColorsImages = Object.keys(colors_images).map((color) => ({
        color,
        images: colors_images[color],
      }));
    }

    /** 🔹 Step 1: Merge new colors & sizes with existing ones **/
    let allColors = [...new Set([...product.colors, ...colors])];
    let allSizes = [...new Set([...product.size, ...size])];

    /** 🔹 Step 2: Generate Required Combinations **/
    let requiredCombinations = allColors.flatMap((c) =>
      allSizes.map((s) => `${c}-${s}`)
    );

    /** 🔹 Step 3: Create Existing Stock Map **/
    let existingStockMap = new Map();
    product.stock.forEach((item) => {
      existingStockMap.set(`${item.color}-${item.size}`, item.quantity);
    });

    /** 🔹 Step 4: Create Provided Stock Map **/
    let providedStockMap = new Map();
    stock.forEach((item) => {
      providedStockMap.set(`${item.color}-${item.size}`, item.quantity);
    });

    /** 🔹 Step 5: Validate Stock Entries (Prevent Missing Updates) **/
    let missingStockEntries = [];
    requiredCombinations.forEach((combo) => {
      if (!providedStockMap.has(combo)) {
        missingStockEntries.push(`${combo}`);
      }
    });

    // return;

    if (missingStockEntries.length > 0) {
      return responseSent(
        res,
        false,
        400,
        "Stock update is required for " + missingStockEntries.join(" | ")
      );
    }

    /** 🔹 Step 6: Update Stock (Adding Old + New Quantity) **/
    let updatedStockMap = new Map(existingStockMap);

    stock.forEach(({ color, size, quantity }) => {
      let key = `${color}-${size}`;
      let existingQty = updatedStockMap.get(key) || 0;
      updatedStockMap.set(key, existingQty + quantity); // 🔥 Add old and new quantity
    });

    let updatedStock = Array.from(updatedStockMap, ([key, quantity]) => {
      const [color, size] = key.split("-");
      return { color, size, quantity };
    });

    /** 🔹 Step 7: Update Product Fields **/
    if (category) product.category = category;
    if (subcategory) product.subcategory = subcategory;
    if (title) product.title = title;
    if (price !== undefined) product.price = price;
    if (discount !== undefined) product.discount = discount;
    if (short_description) product.short_description = short_description;
    if (description) product.description = description;
    if (brand) product.brand = brand;
    if (fabric) product.fabric = fabric;
    if (pattern) product.pattern = pattern;
    if (fit) product.fit = fit;
    if (care_instructions) product.care_instructions = care_instructions;
    if (colors) product.colors = allColors;
    if (colors_images) product.colors_images = formattedColorsImages;
    if (size_type) product.size_type = size_type;
    if (size) product.size = allSizes;
    if (stock) product.stock = updatedStock;

    product.updatedBy = userId;
    product.updatedAt = new Date();

    await product.save();
    responseSent(res, true, 200, "Product updated successfully", { product });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

/**
 * Change Product Status API
 * @description Update the status of a product
 * @param {String} productUri - Unique URI of the product
 * @param {String} status - Status of the product (true/false)
 * @example /api/admin/product/change-status?productUri=abc&status=true
 */
const changeProductStatus = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { productUri, status } = req.query;

    if (role !== "admin" || !userId) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    if (!productUri || status === undefined) {
      return responseSent(
        res,
        false,
        400,
        "Product Uri and Status are required"
      );
    }

    // Convert "true"/"false" string to actual boolean
    const isActive = JSON.parse(status.toLowerCase());

    // Find the product by URI
    const product = await Product.findOne({ uri: productUri });
    if (!product) {
      return responseSent(res, false, 404, "Product not found");
    }

    // Update the product status
    product.isActive = isActive;
    await product.save();

    // Send success response
    responseSent(res, true, 200, "Product status updated successfully");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

/**
 * Delete a product permanently
 * @param {String} productUri - URI of the product to be deleted
 * @example /api/admin/product/delete?productUri=abc
 */
const deleteProduct = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { productUri } = req.query;

    if (!userId || !["admin", "seller"].includes(role)) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    if (role === "seller") {
      // Only active seller accounts are allowed to delete products
      let seller = await User.findById(userId).populate("seller_account");

      if (seller.seller_account.status !== "active") {
        return responseSent(
          res,
          false,
          403,
          "Seller account is not active. Please contact the admin."
        );
      }
    }

    if (!productUri) {
      return responseSent(res, false, 400, "Product URI is required");
    }

    // Find the product
    let product = await Product.findOne({ uri: productUri, isDeleted: false });

    if (!product) {
      return responseSent(res, false, 404, "Product not found");
    }

    // If the user is a seller, they can only delete their own product
    if (role === "seller" && product.createdBy.toString() !== userId) {
      return responseSent(
        res,
        false,
        403,
        "You can only delete your own products"
      );
    }

    // Delete the product permanently
    await Product.findOneAndUpdate(
      { _id: product._id, isDeleted: false },
      { isDeleted: true }
    );

    responseSent(res, true, 200, "Product deleted permanently");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

/**
 * Get the products created by the user, or all products if the user is an admin.
 * The products can be filtered by isActive status, and sorted by createdAt date.
 * The response will include the products and pagination data.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {string} req.query.isActive - The isActive status to filter by.
 * @param {string} req.query.page - The page number to fetch.
 * @param {string} req.query.limit - The number of products to fetch per page.
 * @param {string} req.query.all - If true, fetch all products without pagination.
 * @param {string} req.query.search - The search query to filter by.
 * @param {string} req.query.sortOrder - The sorting order (asc or desc).
 */
const getMyProducts = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let {
      isActive,
      page = 1,
      limit = 10,
      all,
      search,
      sortOrder = "desc",
    } = req.query;

    // Convert page and limit to integers
    page = parseInt(page);
    limit = parseInt(limit);

    // Set up the query filter
    let filter = {
      isDeleted: false,
    };

    if (role !== "admin") {
      filter.createdBy = userId;
    }

    // If search query is provided, add it to filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } }, // Search by title
        { description: { $regex: search, $options: "i" } }, // Search by description
      ];
    }

    // If isActive is provided, filter by isActive status
    if (isActive !== undefined) {
      filter.isActive = isActive === "true"; // Convert string to boolean
    }

    // Set the sorting order
    const sort = sortOrder === "desc" ? { createdAt: -1 } : { createdAt: 1 };

    let products, total;

    // If all=true, return all products without pagination
    if (all === "true") {
      products = await Product.find(filter).sort(sort);
      total = products.length;
    } else {
      // Fetch total count of products
      total = await Product.countDocuments(filter);

      // Fetch the products with pagination
      products = await Product.find(filter)
        .skip((page - 1) * limit) // Skip previous pages
        .limit(limit) // Limit to the specified number of products
        .sort(sort); // Sort by created date
    }

    // Send response with products and pagination data
    responseSent(res, true, 200, "Products fetched successfully.", {
      products,
      page: all === "true" ? null : page, // No pagination if all=true
      limit: all === "true" ? null : limit,
      totalPages: all === "true" ? null : Math.ceil(total / limit),
      totalRecords: total,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

/**
 * Get public product details.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 *
 * @returns {Promise<void>}
 */
const getPublicProduct = async (req, res) => {
  try {
    let { productUri } = req.query;

    if (!productUri) {
      // Return error if product URI is not provided
      return responseSent(res, false, 400, "Product ID is required.");
    }

    // Find product and populate details
    let product = await Product.findOne({
      uri: productUri,
      isDeleted: false,
    })
      .populate("createdBy", "_id first_name last_name seller_account")
      .populate({
        path: "reviews",
        match: { verified: true, isDeleted: false },
        select: "rating comment user createdAt",
        populate: { path: "user", select: "first_name last_name image" },
      });

    if (!product) {
      // Return error if product not found
      return responseSent(res, false, 404, "Product not found.");
    }

    // Fetch total ordered quantity per color and size from order.items
    let orderData = await Order.aggregate([
      { $unwind: "$items" }, // Flatten items array
      {
        $match: {
          "items.product": product._id,
          status: { $ne: "cancelled" }, // Exclude cancelled orders
          $or: [
            { paymentMethod: { $ne: "online" } }, // Include all non-online payments
            {
              $and: [
                { paymentMethod: "online" },
                { status: { $ne: "pending" } },
              ],
            }, // Include online payments only if not pending
          ],
        },
      },
      {
        $group: {
          _id: { color: "$items.color", size: "$items.size" },
          totalOrdered: { $sum: "$items.quantity" }, // Sum quantities
        },
      },
    ]);

    // Convert orderData to a lookup map
    let orderMap = {};
    orderData.forEach((order) => {
      let key = `${order._id.color}-${order._id.size}`;
      orderMap[key] = order.totalOrdered;
    });

    // Calculate availableQuantity and stockTag
    let updatedStock = product.stock.map((item) => {
      let key = `${item.color}-${item.size}`;
      let orderedQty = orderMap[key] || 0; // Default to 0 if not found
      let availableQuantity = item.quantity - orderedQty; // Calculate available stock
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

    // Fetch related products
    let related_products = await Product.aggregate([
      {
        $match: {
          subcategory: product.subcategory._id,
          isActive: true,
          isDeleted: false,
        },
      },
      { $sample: { size: 8 } }, // Randomly select 8 related products
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      { $unwind: "$category" },
      { $unwind: "$subcategory" },
      {
        $project: {
          _id: 1,
          title: 1,
          uri: 1,
          price: 1,
          discount: 1,
          final_price: 1,
          images: 1,
          brand: 1,
          description: 1,
          short_description: 1,
          fabric: 1,
          fit: 1,
          pattern: 1,
          care_instructions: 1,
          size: 1,
          size_type: 1,
          colors: 1,
          colors_images: 1,
          stock: 1,
          isActive: 1,
          isDeleted: 1,
          ratings: 1,
          seo: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: 1,
          category: {
            _id: "$category._id",
            name: "$category.name",
            uri: "$category.uri",
          },
          subcategory: {
            _id: "$subcategory._id",
            name: "$subcategory.name",
            uri: "$subcategory.uri",
          },
        },
      },
    ]);

    let seller_account = {
      address: "Hazratganj, Mahatma Gandhi Marg, Lucknow, Uttar Pradesh, India",
      lat: "26.849684",
      lng: "80.946166",
    };

    if (product.createdBy && product.createdBy.seller_account) {
      // Fetch seller account details
      seller_account = await Seller.findById(
        product.createdBy.seller_account
      ).select("storeName logo address lat lng");
    }

    // Send response with product details, seller account, and related products
    return responseSent(res, true, 200, "Product fetched successfully.", {
      product: JSON.parse(
        JSON.stringify({ ...product.toObject(), stock: updatedStock })
      ),
      seller_account,
      related_products,
    });
  } catch (error) {
    // Handle errors and send response
    return responseSent(res, false, 500, error.message);
  }
};

/**
 * Get Public Products
 * @description Fetch products available to the public with optional filtering by category or subcategory URI
 * @param {Object} req - Request object containing query parameters
 * @param {Object} res - Response object for sending responses
 * @returns {Object} Response with product data and pagination details
 */
const getPublicProducts = async (req, res) => {
  try {
    let { categoryUri, subcategoryUri, page = 1, limit = 10 } = req.query;

    // Convert page and limit to numbers
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Validate presence of category or subcategory URI
    if (!categoryUri && !subcategoryUri) {
      return responseSent(
        res,
        false,
        400,
        "Category or Subcategory URI is required."
      );
    }

    // Find category and subcategory details
    let category = await Category.findOne({ uri: categoryUri }).select("_id");
    let subcategory = await SubCategory.findOne({ uri: subcategoryUri }).select(
      "_id"
    );

    // Check if category or subcategory exists
    if (!category && !subcategory) {
      return responseSent(
        res,
        false,
        404,
        "Category or Subcategory not found."
      );
    }

    // Build filter for fetching products
    let filter = {
      isDeleted: false,
    };
    if (category) filter.category = category._id;
    if (subcategory) filter.subcategory = subcategory._id;

    // Fetch total product count
    let totalRecords = await Product.countDocuments(filter);

    // Fetch products with pagination
    let products = await Product.find(filter)
      .populate("category subcategory", "name uri")
      .populate("createdBy", "_id first_name last_name seller_account")
      .skip(skip)
      .limit(limit);

    // Construct pagination metadata
    let pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalRecords,
    };

    // Send response with products and pagination info
    return responseSent(res, true, 200, "Products fetched successfully.", {
      data: {
        products,
        ...pagination,
      },
    });
  } catch (error) {
    // Handle error and send response
    return responseSent(res, false, 500, error.message);
  }
};

const getPublicProductsFilter = async (req, res) => {
  try {
    let {
      categoryIds,
      subcategoryIds,
      colors,
      sizes,
      priceRanges,
      page = 1,
      limit = 10,
      sortBy = "latest", // Default sort by latest
      hasDiscount,
      brandId,
    } = req.query;

    // Convert comma-separated strings to arrays
    categoryIds = categoryIds ? categoryIds.split(",") : [];
    subcategoryIds = subcategoryIds ? subcategoryIds.split(",") : [];
    colors = colors ? colors.split(",") : [];
    sizes = sizes ? sizes.split(",") : [];
    priceRanges = priceRanges ? priceRanges.split(",") : [];

    // Convert page and limit to numbers
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    const skip = (page - 1) * limit;

    // Build filter for fetching products
    let filter = { isDeleted: false };

    if (categoryIds.length) {
      filter.category = { $in: categoryIds };
    }

    if (subcategoryIds.length) {
      filter.subcategory = { $in: subcategoryIds };
    }

    if (colors.length) {
      filter["stock.color"] = { $in: colors };
    }

    if (sizes.length) {
      filter["stock.size"] = { $in: sizes };
    }

    // Handle price ranges
    if (priceRanges.length) {
      const priceConditions = priceRanges
        .map((range) => {
          const [min, max] = range.split("-").map(Number);
          if (!isNaN(min)) {
            if (max) {
              return { final_price: { $gte: min, $lte: max } };
            } else {
              return { final_price: { $lte: min } };
            }
          }
          return null;
        })
        .filter(Boolean);

      if (priceConditions.length) {
        filter.$or = priceConditions;
      }
    }

    // Apply discount filter
    // Apply discount filter
    if (hasDiscount === "true") {
      filter.discount = { $gt: 0 };
    }

    // Apply brand filter
    if (brandId) {
      filter["createdBy"] = brandId;
    }

    // Define sorting logic
    let sortOptions = {};
    if (sortBy === "latest") {
      sortOptions = { createdAt: -1 }; // Newest first
    } else if (sortBy === "priceAsc") {
      sortOptions = { final_price: 1 }; // Lowest price first
    } else if (sortBy === "priceDesc") {
      sortOptions = { final_price: -1 }; // Highest price first
    }

    // Fetch total product count
    const totalRecords = await Product.countDocuments(filter);

    // Fetch products with pagination and sorting
    const products = await Product.find(filter)
      .populate("category", "name uri")
      .populate("subcategory", "name uri")
      .populate("createdBy", "_id first_name last_name seller_account")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Construct pagination metadata
    const pagination = {
      currentPage: page,
      limit,
      totalPages: Math.ceil(totalRecords / limit),
      totalRecords,
    };

    // Send response with products and pagination info
    return responseSent(res, true, 200, "Products fetched successfully.", {
      data: {
        products,
        ...pagination,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return responseSent(res, false, 500, error.message);
  }
};

const getTopSellerItems = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    const result = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQuantity: { $sum: "$items.quantity" },
          uniqueOrders: { $addToSet: "$_id" },
        },
      },
      {
        $project: {
          productId: "$_id",
          totalQuantity: 1,
          orderCount: { $size: "$uniqueOrders" },
          _id: 0,
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    const topRecords = result.slice(0, limit);

    const topIds = topRecords.map((item) => item.productId);

    const topProducts = await Product.find({ _id: { $in: topIds } })
      .populate("category", "name uri")
      .populate("subcategory", "name uri")
      .populate("createdBy", "_id first_name last_name seller_account");

    const uniqueProductsCount = result.length;

    return res.status(200).json({
      success: true,
      message: "Delivered product purchase summary",
      data: topProducts,
      page,
      limit,
      totalRecords: uniqueProductsCount,
    });
  } catch (error) {
    console.error("Error fetching product summary:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const universalFilter = async (req, res) => {
  try {
    let { search, page = 1, limit = 10, sortBy = "latest" } = req.query;

    // Convert to numbers
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    // Build search filter
    const searchRegex = search ? new RegExp(search, "i") : null;

    // Determine sorting options
    const sortOptions = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      priceAsc: { final_price: 1 },
      priceDesc: { final_price: -1 },
    }[sortBy] || { createdAt: -1 };

    let response = [];

    if (searchRegex) {
      // Search for subcategories
      const subcategories = await SubCategory.find({ name: searchRegex })
        .select("name uri image description")
        .populate("category_id", "name uri")
        .limit(limit)
        .skip(skip);
      if (subcategories.length) {
        response.push(
          ...subcategories.map((subcategory) => ({
            isType: "subcategory",
            ...subcategory._doc,
          }))
        );
      }

      // Search for sellers
      const sellers = await Seller.find({
        storeName: searchRegex,
      })
        .select("storeName address logo")
        .populate("user_id", "first_name last_name")
        .limit(limit)
        .skip(skip);
      if (sellers.length) {
        response.push(
          ...sellers.map((seller) => ({
            isType: "seller",
            ...seller._doc,
            image: seller.logo,
            description: seller.address,
          }))
        );
      }

      // Search for products if no results found yet
      if (response.length === 0) {
        const productFilter = {
          isDeleted: false,
          $or: [
            { title: searchRegex },
            { "createdBy.seller_account.storeName": searchRegex },
            { "subcategory.name": searchRegex },
          ],
        };

        const totalRecords = await Product.countDocuments(productFilter);
        const products = await Product.find(productFilter)
          .select(
            "title uri colors_images category subcategory short_description"
          )
          .populate("category", "name uri")
          .populate("subcategory", "name uri")
          .sort(sortOptions)
          .skip(skip)
          .limit(limit);

        response = products.map((product) => ({
          isType: "product",
          image: product.colors_images?.[0]?.images?.[0] || null,
          ...product._doc,
          description: product.short_description,
        }));

        response.pagination = {
          currentPage: page,
          limit,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
        };
      }
    }

    return responseSent(
      res,
      true,
      200,
      "Filtered results fetched successfully.",
      response
    );
  } catch (error) {
    console.error("Error fetching filtered results:", error.message);
    return responseSent(res, false, 500, "Error fetching filtered results.");
  }
};

module.exports = {
  createProduct,
  updateProduct,
  defaultRoute,
  getMyProducts,
  getPublicProduct,
  changeProductStatus,
  deleteProduct,
  getPublicProducts,
  getPublicProductsFilter,
  getTopSellerItems,
  universalFilter,
};
