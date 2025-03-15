const { responseSent } = require("../Helper/responseSent");
const ContactUs = require("../Models/ContactUs");

const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "Contact-us routes.");
};

const createContactUs = async (req, res) => {
  try {
    let { name, email, phone, reason, description } = req.body;
    if (!name || !email || !phone || !reason || !description) {
      return responseSent(res, false, 400, "Please fill all required fields.");
    }

    let existEnquiry = await ContactUs.findOne({
      name,
      email,
      phone,
      reason,
      is_deleted: false,
      status: { $in: ["pending", "in-progress"] },
    });

    if (existEnquiry) {
      return responseSent(
        res,
        false,
        401,
        `Your previous enquiry is ${existEnquiry.status}.`
      );
    }

    let newEnquiry = await ContactUs.create({
      name,
      email,
      phone,
      reason,
      description,
    });

    responseSent(res, true, 201, "Enquiry sent successfully.", {
      enquiry: newEnquiry,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const changeStatus = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { enquiry_id, status } = req.query;

    const allowedStatus = ["pending", "in-progress", "closed"];

    if (!userId || role !== "admin") {
      return responseSent(res, false, 401, "Unauthorized");
    }

    if (!enquiry_id || !allowedStatus.includes(status)) {
      return responseSent(res, false, 400, "Invalid enquiry ID or status.");
    }

    let enquiry = await ContactUs.findById(enquiry_id);

    if (!enquiry) {
      return responseSent(res, false, 404, "Enquiry not found.");
    }

    enquiry.status = status;
    await enquiry.save();

    return responseSent(res, true, 200, "Enquiry updated successfully.");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const deleteContactUs = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { enquiry_id } = req.query;

    if (!userId || role !== "admin") {
      return responseSent(res, false, 401, "Unauthorized");
    }

    if (!enquiry_id) {
      return responseSent(res, false, 400, "Invalid enquiry ID.");
    }

    let enquiry = await ContactUs.findById(enquiry_id);

    if (!enquiry) {
      return responseSent(res, false, 404, "Enquiry not found.");
    }

    enquiry.is_deleted = true;
    await enquiry.save();

    responseSent(res, true, 200, "Enquiry deleted successfully.");
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

const getContactUsRecords = async (req, res) => {
  try {
    let { userId, role } = req.auth;

    if (role !== "admin" || !userId) {
      return responseSent(res, false, 401, "Unauthorized");
    }

    let {
      status,
      page = 1,
      limit = 10,
      search,
      sortOrder = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    let filter = { is_deleted: false };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    let total = await ContactUs.countDocuments(filter);
    let enquirys = await ContactUs.find(filter)
      .sort({ createdAt: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return responseSent(res, true, 200, "Enquiry retrieved successfully", {
      enquirys,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
    });
  } catch (error) {
    responseSent(res, false, 500, error.message);
  }
};

module.exports = {
  defaultRoute,
  createContactUs,
  changeStatus,
  deleteContactUs,
  getContactUsRecords,
};
