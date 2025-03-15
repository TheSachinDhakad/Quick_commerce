const { responseSent } = require("../Helper/responseSent");
const Address = require("../Models/Address");
const User = require("../Models/User");

const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "Address routes.");
};


/**
 * Add a new address for a user.
 * 
 * @param {Object} req - The request object containing user and address data.
 * @param {Object} res - The response object for sending back status and data.
 */
const addAddress = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let {
      name,
      phone,
      address,
      lat,
      lng,
      isDefault = false,
      address_type,
    } = req.body;

    // Validate required fields
    if (!name || !phone || !address || !address_type) {
      return responseSent(res, false, 400, "Please fill all required fields.");
    }

    // Validate latitude and longitude
    if (!lat || !lng) {
      return responseSent(
        res,
        false,
        400,
        "Latitude and Longitude are required."
      );
    }

    // Check user authorization
    if (role !== "user" || !userId) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    // Verify user existence
    let user = await User.findById(userId);
    if (!user) {
      return responseSent(res, false, 404, "User not found");
    }

    // Check for existing addresses and set as default if it's the first
    let existingAddresses = await Address.find({
      user_id: userId,
      isDeleted: false,
    });
    if (existingAddresses.length === 0) {
      isDefault = true;
    }

    // If isDefault is true, update other addresses to non-default
    if (isDefault) {
      await Address.updateMany(
        { user_id: userId, isDefault: true },
        { isDefault: false }
      );
    }

    // Create a new address
    let newAddress = await Address.create({
      user_id: userId,
      name,
      phone,
      address,
      lat,
      lng,
      isDefault,
      type: address_type,
    });

    // Handle address creation failure
    if (!newAddress) {
      return responseSent(res, false, 500, "Failed to add address");
    }

    // Add new address to user's address list and save
    user.address.push(newAddress._id);
    await user.save();

    // Respond success with new address data
    responseSent(res, true, 200, "Address added successfully", {
      address: newAddress,
    });
  } catch (error) {
    // Handle any errors
    responseSent(res, false, 500, error.message);
  }
};


/**
 * Retrieve all non-deleted addresses for the authenticated user.
 * 
 * @param {Object} req - The request object containing auth details.
 * @param {Object} res - The response object used to send back data.
 */
const getAddress = async (req, res) => {
  try {
    // Extract userId and role from request authentication
    let { userId, role } = req.auth;

    // Check if the user is authorized
    if (role !== "user" || !userId) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    // Fetch the user along with their non-deleted addresses
    let user = await User.findById(userId).populate({
      path: "address",
      match: { isDeleted: false },
    });

    // Handle case where user is not found
    if (!user) {
      return responseSent(res, false, 404, "User not found");
    }

    // Respond with the list of addresses
    responseSent(res, true, 200, "Addresses retrieved successfully", {
      addresses: user.address,
    });
  } catch (error) {
    // Handle any errors that occur
    responseSent(res, false, 500, error.message);
  }
};

/**
 * Updates an existing address for the authenticated user.
 * 
 * @param {Object} req - The request object containing auth details and address data.
 * @param {Object} res - The response object used to send back data.
 */
const updateAddress = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { name, phone, address, lat, lng, isDefault, address_type } = req.body;
    let { addressId } = req.params;

    // Check user authorization
    if (role !== "user" || !userId) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    // Fetch the address data
    let addressData = await Address.findOne({
      _id: addressId,
      user_id: userId,
      isDeleted: false,
    });

    // Handle case where address is not found
    if (!addressData) {
      return responseSent(res, false, 404, "Address not found");
    }

    // If isDefault is set to true, remove default from other addresses
    if (isDefault) {
      await Address.updateMany(
        { user_id: userId, isDefault: true },
        { isDefault: false }
      );
    }

    // Update the address data
    addressData.name = name || addressData.name;
    addressData.phone = phone || addressData.phone;
    addressData.address = address || addressData.address;
    addressData.lat = lat || addressData.lat;
    addressData.lng = lng || addressData.lng;
    addressData.isDefault = isDefault ?? addressData.isDefault;
    addressData.type = address_type || addressData.type;

    // Save the updated address data
    await addressData.save();

    // Respond with the updated address
    responseSent(res, true, 200, "Address updated successfully", {
      address: addressData,
    });
  } catch (error) {
    // Handle any errors that occur
    responseSent(res, false, 500, error.message);
  }
};


/**
 * Deletes an address for the authenticated user.
 * 
 * @param {Object} req - The request object containing auth details and address data.
 * @param {Object} res - The response object used to send back data.
 */
const deleteAddress = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { addressId } = req.params;

    // Check user authorization
    if (role !== "user" || !userId) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    // Fetch the address data
    let addressData = await Address.findOne({
      _id: addressId,
      user_id: userId,
      isDeleted: false,
    });

    // Handle case where address is not found
    if (!addressData) {
      return responseSent(res, false, 404, "Address not found");
    }

    // Mark the address as deleted
    let wasDefault = addressData.isDefault; // Keep track of whether the deleted address was default
    addressData.isDeleted = true;
    addressData.isDefault = false; // Mark it as non-default before deleting
    await addressData.save();

    // If deleted address was default, assign another one as default
    if (wasDefault) {
      let newDefault = await Address.findOne({
        user_id: userId,
        isDeleted: false,
      });

      if (newDefault) {
        newDefault.isDefault = true; // Mark another one as default
        await newDefault.save();
      }
    }

    // Respond with success
    responseSent(res, true, 200, "Address deleted successfully");
  } catch (error) {
    // Handle any errors that occur
    responseSent(res, false, 500, error.message);
  }
};

module.exports = {
  defaultRoute,
  addAddress,
  getAddress,
  updateAddress,
  deleteAddress,
};
