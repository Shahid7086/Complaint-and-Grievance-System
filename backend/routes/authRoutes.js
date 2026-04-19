const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { runtimeStore, createId } = require("../utils/runtimeStore");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "grievance_secret_key";
const JWT_EXPIRES_IN = "7d";

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role || "user",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();
    const useDb = isDatabaseReady();
    const existingUser = useDb
      ? await User.findOne({ email: normalizedEmail })
      : runtimeStore.users.find((u) => u.email === normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ error: "User already exists with this email." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = useDb
      ? await User.create({
          name: normalizedName,
          email: normalizedEmail,
          passwordHash,
        })
      : (() => {
          const inMemoryUser = {
            _id: createId(),
            name: normalizedName,
            email: normalizedEmail,
            passwordHash,
          };
          runtimeStore.users.push(inMemoryUser);
          return inMemoryUser;
        })();

    const token = createToken(user);
    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const useDb = isDatabaseReady();
    const user = useDb
      ? await User.findOne({ email: normalizedEmail })
      : runtimeStore.users.find((u) => u.email === normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = createToken(user);
    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@grievance.com")
      .toLowerCase()
      .trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (email.toLowerCase().trim() !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ error: "Invalid admin credentials." });
    }

    const adminUser = {
      _id: "admin",
      name: "Admin",
      email: adminEmail,
      role: "admin",
    };

    const token = createToken(adminUser);
    return res.json({
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
