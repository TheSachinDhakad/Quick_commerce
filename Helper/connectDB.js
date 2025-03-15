const mongoose = require("mongoose");

const connectDB = async (MONGO_URI) => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("DB connection successful");
    return { success: true, message: "DB connection successful" };
  } catch (error) {
    console.log("DB connection failed:", error.message);
    return {
      success: false,
      message: "DB connection failed",
      error: error.message,
    };
  }
};

module.exports = { connectDB };
