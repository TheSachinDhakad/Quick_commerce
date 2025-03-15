const { generateURL } = require("../Helper/helper");
const { responseSent } = require("../Helper/responseSent");
const Category = require("../Models/Category");
const SubCategory = require("../Models/SubCategory");

const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "Default route");
};

// category controller

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const { userId, role } = req.auth;

    if (!name || !description) {
      return responseSent(res, false, 400, "All fields are required.");
    }

    if (role !== "admin" || !userId) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    let catUri = generateURL(name);

    let old_cat = await Category.findOne({ uri: catUri });

    if (old_cat) {
      return responseSent(res, false, 400, "Category already exists");
    }

    let category = await Category.create({
      user_id: userId,
      name,
      description,
      uri: catUri,
      userId,
    });

    return responseSent(res, true, 201, "Category created successfully", {
      category,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const getCategories = async (req, res) => {
  try {
    let categories = await Category.find({ is_deleted: false }).populate({
      path: "sub_categories",
      match: { is_deleted: false }, // Corrected from "filter" to "match"
      select: "uri category_id name image description", // Ensuring selected fields are correct
    });

    return responseSent(res, true, 200, "Categories retrieved successfully", {
      categories,
    });
  } catch (error) {
    return responseSent(res, false, 500, error.message);
  }
};

const editCategory = async (req, res) => {
  try {
    let { name, description } = req.body;
    let { category_id } = req.params;
    let { userId, role } = req.auth;
    let catUri = generateURL(name);

    // Validate required fields
    if (!name || !description) {
      return responseSent(res, false, 400, "Name and description are required");
    }

    // Check admin role & authentication
    if (role !== "admin" || !userId) {
      return responseSent(res, false, 403, "Forbidden");
    }

    // Check if category with the same name already exists (excluding the current one)
    let existingCategory = await Category.findOne({ name, is_deleted: false });
    if (existingCategory && existingCategory._id.toString() !== category_id) {
      return responseSent(
        res,
        false,
        400,
        "Category with this name already exists"
      );
    }

    // Update category
    let updatedCategory = await Category.findByIdAndUpdate(
      category_id,
      { name, description, uri: catUri }, // Updating the required fields
      { new: true } // Returns the updated document
    );

    // If category not found
    if (!updatedCategory) {
      return responseSent(res, false, 404, "Category not found");
    }

    return responseSent(res, true, 200, "Category updated successfully", {
      category: updatedCategory,
    });
  } catch (error) {
    return responseSent(res, false, 500, error.message);
  }
};

const deleteCategory = async (req, res) => {
  try {
    let { category_id } = req.params;
    let { userId, role } = req.auth;

    // Check admin role & authentication
    if (role !== "admin" || !userId) {
      return responseSent(res, false, 403, "Forbidden");
    }

    // Find the category
    let category = await Category.findById(category_id);
    if (!category || category.is_deleted) {
      return responseSent(res, false, 404, "Category not found");
    }

    // Soft delete: Update `is_deleted` to `true`
    category.is_deleted = true;
    await category.save();

    return responseSent(res, true, 200, "Category deleted successfully");
  } catch (error) {
    return responseSent(res, false, 500, error.message);
  }
};

// subcategory controller
const createSubcategory = async (req, res) => {
  try {
    let { name, description, image } = req.body;
    let { category_id } = req.params;
    let { userId, role } = req.auth;

    // Validate required fields
    if (!name || !description || !image || !category_id) {
      return responseSent(res, false, 400, "All fields are required.");
    }

    // Check if the user is an admin
    if (role !== "admin" || !userId) {
      return responseSent(res, false, 403, "Unauthorized");
    }

    // Generate a unique URI
    let subCatUri = generateURL(`${name} ${Date.now()}`);

    // Check if subcategory already exists (ignoring deleted ones)
    let existingSubCategory = await SubCategory.findOne({
      name,
      category_id,
      is_deleted: false,
    });

    if (existingSubCategory) {
      return responseSent(
        res,
        false,
        400,
        "Subcategory with this name already exists."
      );
    }

    // Create new subcategory
    let subCategory = await SubCategory.create({
      category_id,
      user_id: userId,
      name,
      description,
      image,
      uri: subCatUri,
      is_deleted: false, // Ensure it's not deleted on creation
    });

    // Update the parent category to include the new subcategory
    await Category.findByIdAndUpdate(category_id, {
      $push: { sub_categories: subCategory._id },
    });

    return responseSent(res, true, 201, "Subcategory created successfully", {
      subCategory,
    });
  } catch (error) {
    return responseSent(res, false, 500, error.message);
  }
};

const editSubcategory = async (req, res) => {
  try {
    let { name, description, image } = req.body;
    let { subcategory_id } = req.params;
    let { userId, role } = req.auth;

    // Validate required fields
    if (!name || !description || !image) {
      return responseSent(res, false, 400, "All fields are required.");
    }

    // Check if the user is an admin
    if (role !== "admin" || !userId) {
      return responseSent(res, false, 403, "Unauthorized");
    }

    // Check if subcategory exists and is not deleted
    let subCategory = await SubCategory.findOne({
      _id: subcategory_id,
      is_deleted: false,
    });

    if (!subCategory) {
      return responseSent(res, false, 404, "Subcategory not found.");
    }

    // Generate a new unique URI if the name is changed
    let subCatUri = generateURL(`${name} ${Date.now()}`);

    // Update subcategory
    subCategory.name = name;
    subCategory.description = description;
    subCategory.image = image;
    subCategory.uri = subCatUri;
    subCategory.updated_at = new Date();

    await subCategory.save();

    return responseSent(res, true, 200, "Subcategory updated successfully", {
      subCategory,
    });
  } catch (error) {
    return responseSent(res, false, 500, error.message);
  }
};

const deleteSubcategory = async (req, res) => {
  try {
    let { subcategory_id } = req.params;
    let { userId, role } = req.auth;

    // Check if the user is an admin
    if (role !== "admin" || !userId) {
      return responseSent(res, false, 403, "Unauthorized");
    }

    // Find the subcategory
    let subCategory = await SubCategory.findById(subcategory_id);

    if (!subCategory || subCategory.is_deleted) {
      return responseSent(res, false, 404, "Subcategory not found.");
    }

    // Soft delete: Set `is_deleted` to true
    subCategory.is_deleted = true;
    await subCategory.save();

    return responseSent(res, true, 200, "Subcategory deleted successfully");
  } catch (error) {
    return responseSent(res, false, 500, error.message);
  }
};

module.exports = {
  defaultRoute,
  createCategory,
  getCategories,
  editCategory,
  deleteCategory,
  createSubcategory,
  editSubcategory,
  deleteSubcategory,
};
