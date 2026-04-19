const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: String,
  email: String,
  complaint: String,
  department: {
    type: String,
    enum: ["Household", "Government", "Private", "Other"],
    default: "Other",
  },
  subcategory: {
    type: String,
    default: "",
  },
  complaintTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Resolved"],
    default: "Pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);