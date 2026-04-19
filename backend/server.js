const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const complaintRoutes = require("./routes/complaintRoutes");
const authRoutes = require("./routes/authRoutes");

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.post("/api/auth/admin-login", (req, res) => {
  const { email, password } = req.body || {};
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@grievance.com")
    .toLowerCase()
    .trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const jwtSecret = process.env.JWT_SECRET || "grievance_secret_key";

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  if (email.toLowerCase().trim() !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ error: "Invalid admin credentials." });
  }

  const adminUser = {
    id: "admin",
    name: "Admin",
    email: adminEmail,
    role: "admin",
  };

  const token = jwt.sign(
    {
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    },
    jwtSecret,
    { expiresIn: "7d" }
  );

  return res.json({ token, user: adminUser });
});

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/grievanceDB";
const MONGO_TIMEOUT_MS = Number(process.env.MONGO_TIMEOUT_MS) || 4000;

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: MONGO_TIMEOUT_MS,
      connectTimeoutMS: MONGO_TIMEOUT_MS,
      socketTimeoutMS: MONGO_TIMEOUT_MS,
    });
    console.log("MongoDB Connected ✅");
  } catch (err) {
    console.log("Mongo Error:", err.message);
    console.log("Running in memory fallback mode (no MongoDB).");
  }

  const server = app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });

  server.on("error", (err) => {
    console.error("Server error:", err.message);
    process.exit(1);
  });
};

startServer();