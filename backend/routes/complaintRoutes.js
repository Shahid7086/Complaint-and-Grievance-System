const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Model import
const Complaint = require("../models/Complaint");
const History = require("../models/History");
const authMiddleware = require("../middleware/authMiddleware");
const { runtimeStore, createId } = require("../utils/runtimeStore");

router.use(authMiddleware);

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

function isAdmin(req) {
  return req.user?.role === "admin";
}

const SUBCATEGORY_BY_DEPARTMENT = {
  Government: [
    "Banking",
    "Post Office",
    "Government School",
    "Electricity Board",
    "Water Supply",
    "Transport (Bus/Railway)",
    "Municipality",
    "Police Department",
    "Government Hospital",
    "Tax Department",
    "Passport Office",
    "Land Records",
    "Court Services",
    "Public Distribution System",
    "Other",
  ],
  Private: [
    "Private Bank",
    "Private School",
    "E-commerce",
    "Telecom",
    "Internet Provider",
    "Private Hospital",
    "Delivery Services",
    "Real Estate",
    "Insurance",
    "Other",
  ],
  Household: [
    "Plumbing",
    "Electricity",
    "Cleaning",
    "Furniture",
    "Appliance Repair",
    "Pest Control",
    "Other",
  ],
  Other: ["Other"],
};

function isValidSubcategory(department, subcategory) {
  const options = SUBCATEGORY_BY_DEPARTMENT[department] || SUBCATEGORY_BY_DEPARTMENT.Other;
  return options.includes(subcategory);
}

function normalizeIncomingSubcategory(payload = {}) {
  const raw =
    typeof payload.subcategory === "string"
      ? payload.subcategory
      : typeof payload.subCategory === "string"
        ? payload.subCategory
        : "";
  return raw.trim();
}

function normalizeComplaintPayload(payload = {}) {
  const complaintTime = payload.complaintTime ? new Date(payload.complaintTime) : null;
  const validComplaintTime =
    complaintTime instanceof Date && !Number.isNaN(complaintTime.getTime())
      ? complaintTime
      : new Date();
  const department = payload.department || "Other";
  const subcategory = normalizeIncomingSubcategory(payload);
  const { subCategory, ...rest } = payload;
  return {
    ...rest,
    department,
    subcategory,
    complaintTime: validComplaintTime,
  };
}

function attachCanonicalSubcategory(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const subcategory = plain.subcategory || "";
  return { ...plain, subcategory };
}

async function createHistoryEntry({ complaintId, action, changedBy }) {
  if (isDatabaseReady()) {
    await History.create({ complaintId, action, changedBy, timestamp: new Date() });
    return;
  }
  runtimeStore.histories.push({
    _id: createId(),
    complaintId: String(complaintId),
    action,
    changedBy,
    timestamp: new Date().toISOString(),
  });
}

// ➕ Add Complaint
router.post("/add", async (req, res) => {
  console.log("POST /add body:", req.body);
  console.log("POST /add subcategory fields:", {
    subcategory: req.body?.subcategory,
    subCategory: req.body?.subCategory,
  });
  try {
    const payload = normalizeComplaintPayload(req.body);
    if (!payload.name || !payload.email || !payload.complaint) {
      return res
        .status(400)
        .json({ error: "Name, email, and complaint are required." });
    }
    if (!payload.subcategory) {
      return res.status(400).json({ error: "Sub category is required." });
    }
    if (!isValidSubcategory(payload.department, payload.subcategory)) {
      return res.status(400).json({ error: "Invalid sub category for selected department." });
    }
    if (isDatabaseReady()) {
      const newComplaint = new Complaint({
        ...payload,
        userId: req.user.userId,
      });
      await newComplaint.save();
    } else {
      runtimeStore.complaints.push({
        _id: createId(),
        ...payload,
        userId: req.user.userId,
        status: payload.status || "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    res.json("Complaint Submitted ✅");
  } catch (err) {
    console.error("POST /add error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});


// 📥 Get All Complaints
router.get("/", async (req, res) => {
  console.log("GET /api/complaints/");
  try {
    const query = {};
    if (!isAdmin(req)) {
      query.userId = req.user.userId;
    }
    if (req.query.status && req.query.status !== "All") {
      query.status = req.query.status;
    }
    if (req.query.department && req.query.department !== "All") {
      query.department = req.query.department;
    }
    const search = (req.query.search || "").trim();
    const data = isDatabaseReady()
      ? await Complaint.find(
          search
            ? {
                ...query,
                $or: [
                  { name: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
                  { complaint: { $regex: search, $options: "i" } },
                  { subcategory: { $regex: search, $options: "i" } },
                ],
              }
            : query
        )
          .sort({ createdAt: -1 })
          .lean()
      : runtimeStore.complaints
          .filter(
            (c) =>
              (!query.userId || c.userId === query.userId) &&
              (!query.status || c.status === query.status) &&
              (!query.department || c.department === query.department)
          )
          .filter((c) => {
            if (!search) return true;
            return [c.name, c.email, c.complaint, c.subcategory]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase());
          })
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const result = data.map(attachCanonicalSubcategory);
    if (result.length > 0) {
      console.log("[DEBUG] GET /complaints first item subcategory:", result[0].subcategory);
    }
    res.json(result);
  } catch (err) {
    console.error("GET / error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    if (
      !isAdmin(req) &&
      (typeof req.body.status !== "undefined" ||
        typeof req.body.department !== "undefined" ||
        typeof req.body.subcategory !== "undefined" ||
        typeof req.body.subCategory !== "undefined")
    ) {
      return res
        .status(403)
        .json({ error: "Only admins can update status, department, or subcategory." });
    }

    const allowedUpdates = {};
    if (req.body.status) {
      allowedUpdates.status = req.body.status;
    }
    if (req.body.department) {
      allowedUpdates.department = req.body.department;
    }
    if (typeof req.body.subcategory !== "undefined" || typeof req.body.subCategory !== "undefined") {
      allowedUpdates.subcategory = normalizeIncomingSubcategory(req.body);
    }
    if (req.body.complaintTime) {
      allowedUpdates.complaintTime = new Date(req.body.complaintTime);
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update." });
    }

    let previous;
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user.userId };

    if (isDatabaseReady()) {
      previous = await Complaint.findOne(filter);
    } else {
      const idx = runtimeStore.complaints.findIndex(
        (c) =>
          c._id === req.params.id &&
          (isAdmin(req) || c.userId === req.user.userId)
      );
      if (idx !== -1) {
        previous = { ...runtimeStore.complaints[idx] };
      }
    }

    if (!previous) {
      return res.status(404).json({ error: "Complaint not found." });
    }

    const nextDepartment = allowedUpdates.department || previous.department || "Other";
    const nextSubcategory =
      typeof allowedUpdates.subcategory === "undefined"
        ? previous.subcategory || ""
        : allowedUpdates.subcategory;

    if (!nextSubcategory) {
      return res.status(400).json({ error: "Sub category is required." });
    }
    if (!isValidSubcategory(nextDepartment, nextSubcategory)) {
      return res.status(400).json({ error: "Invalid sub category for selected department." });
    }

    let updated;
    if (isDatabaseReady()) {
      updated = await Complaint.findOneAndUpdate(filter, allowedUpdates, { new: true });
    } else {
      const idx = runtimeStore.complaints.findIndex(
        (c) =>
          c._id === req.params.id &&
          (isAdmin(req) || c.userId === req.user.userId)
      );
      if (idx !== -1) {
        runtimeStore.complaints[idx] = {
          ...runtimeStore.complaints[idx],
          ...allowedUpdates,
          updatedAt: new Date().toISOString(),
        };
        updated = runtimeStore.complaints[idx];
      }
    }

    if (!updated) {
      return res.status(404).json({ error: "Complaint not found." });
    }

    if (isAdmin(req) && previous) {
      if (previous.status !== updated.status) {
        await createHistoryEntry({
          complaintId: updated._id,
          action: `Status changed from "${previous.status}" to "${updated.status}"`,
          changedBy: req.user.email || "admin",
        });
      }
      if (previous.department !== updated.department) {
        await createHistoryEntry({
          complaintId: updated._id,
          action: `Department changed from "${previous.department || "N/A"}" to "${updated.department || "N/A"}"`,
          changedBy: req.user.email || "admin",
        });
      }
      const prevSub = previous.subcategory || "";
      const nextSub = updated.subcategory || "";
      if (prevSub !== nextSub) {
        await createHistoryEntry({
          complaintId: updated._id,
          action: `Subcategory changed from "${prevSub || "N/A"}" to "${nextSub || "N/A"}"`,
          changedBy: req.user.email || "admin",
        });
      }
    }
    res.json("Status Updated ✅");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete("/delete/:id", async (req, res) => {
  try {
    let deleted;
    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user.userId };
    if (isDatabaseReady()) {
      deleted = await Complaint.findOneAndDelete(filter);
    } else {
      const idx = runtimeStore.complaints.findIndex(
        (c) =>
          c._id === req.params.id &&
          (isAdmin(req) || c.userId === req.user.userId)
      );
      if (idx !== -1) {
        deleted = runtimeStore.complaints[idx];
        runtimeStore.complaints.splice(idx, 1);
      }
    }

    if (!deleted) {
      return res.status(404).json({ error: "Complaint not found." });
    }
    res.json("Complaint Deleted 🗑️");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history/:id", async (req, res) => {
  try {
    const complaintId = req.params.id;
    const history = isDatabaseReady()
      ? await History.find({ complaintId }).sort({ timestamp: -1 })
      : runtimeStore.histories
          .filter((h) => h.complaintId === complaintId)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;