const { responseSent } = require("../Helper/responseSent");
const DeliveryPartner = require("../Models/DeliveryPartner");

// Controller
const createPartner = async (req, res) => {
  try {
    let {
      name,
      location,
      vehicle,
      bike_number,
      phone,
      email,
      address,
      img,
      licence_number,
    } = req.body;
    if (
      !name ||
      !location ||
      !vehicle ||
      !bike_number ||
      !phone ||
      !email ||
      !address ||
      !img ||
      !licence_number
    ) {
      return responseSent(res, false, 400, "Please fill all required fields");
    }

    let existingPartner = await DeliveryPartner.findOne({
      $or: [{ phone }, { email }, { bike_number }, { licence_number }],
      is_deleted: false,
    });

    if (existingPartner) {
      return responseSent(
        res,
        false,
        400,
        "A partner with the same details already exists."
      );
    }

    let newPartner = await DeliveryPartner.create(req.body);
    responseSent(res, true, 201, "Delivery partner created successfully.", {
      partner: newPartner,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const getPartners = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    let filter = { is_deleted: false };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    let totalRecords = await DeliveryPartner.countDocuments(filter);
    let partners = await DeliveryPartner.find(filter)
      .skip((page - 1) * limit)
      .limit(limit);

    responseSent(res, true, 200, "Partners retrieved successfully", {
      partners,
      totalRecords,
      page,
      limit,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const updatePartner = async (req, res) => {
  try {
    let { partner_id } = req.params;
    let updatedPartner = await DeliveryPartner.findByIdAndUpdate(
      partner_id,
      req.body,
      { new: true }
    );
    if (!updatedPartner) {
      return responseSent(res, false, 404, "Partner not found.");
    }
    responseSent(res, true, 200, "Partner updated successfully", {
      partner: updatedPartner,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const deletePartner = async (req, res) => {
  try {
    let { partner_id } = req.params;
    let partner = await DeliveryPartner.findById(partner_id);
    if (!partner) {
      return responseSent(res, false, 404, "Partner not found.");
    }
    partner.is_deleted = true;
    await partner.save();
    responseSent(res, true, 200, "Partner deleted successfully.");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const getPublicPartners = async (req, res) => {
  try {
    let partners = await DeliveryPartner.find({ is_deleted: false }).select(
      "_id name location vehicle bike_number img"
    );
    responseSent(res, true, 200, "Partners retrieved successfully", {
      partners,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

module.exports = {
  createPartner,
  getPartners,
  updatePartner,
  deletePartner,
  getPublicPartners,
};
