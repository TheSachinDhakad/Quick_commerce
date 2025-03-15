const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User" },
    category_id: { type: Schema.Types.ObjectId, ref: "Category" },
    uri: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    is_deleted: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SubCategory", categorySchema);