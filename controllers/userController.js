// controllers/authController.js
import { User } from "../model/models.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * Register a new user
 *
 * - Validates if email is already registered
 * - Hashes the password with bcrypt before saving
 * - Saves minimal user data and returns a success response
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Prevent duplicate accounts: email must be unique
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // 400 Bad Request -- user already exists
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password before storing (security best practice)
    // bcrypt.hash returns a promise; 10 is a reasonable salt rounds value for dev.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save user with hashed password
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    // 201 Created - user successfully registered
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    // Generic 500 for unexpected server/database errors
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Login user
 *
 * - Verifies credentials (email & password)
 * - On success issues a JWT that the frontend will store (e.g., localStorage)
 * - Returns token + minimal user info for client state
 *
 * NOTE: The token payload uses `{ userId }` (ensure authMiddleware reads same key).
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (if not found - invalid credentials)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare provided password with the hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT token. Payload includes userId so authMiddleware can set req.user
    // Keep the payload minimal — only what you need to identify the user.
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return token and a small user object (avoid sending password)
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
      message: "Login successful",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get user data by ID
 *
 * - Used by dashboard/profile endpoints to retrieve user metadata.
 * - .select('-password') ensures we don't send the hashed password to client.
 */
export const getUserData = async (req, res) => {
  try {
    // We accept user id as URL param (e.g., /api/users/:id)
    const userId = req.params.id;

    // Find user and exclude password field
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user object (safe to send since password is excluded)
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Given an array of emails, return corresponding user IDs
 *
 * - Useful when frontend provides member emails (e.g., create group by emails)
 * - Backend resolves emails -> ids (required for foreign key references)
 * - Only returns _id array to avoid leaking unnecessary user data
 */
export const getUserIdsByEmail = async (req, res) => {
  try {
    const { emails } = req.body;
    // Validate input
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ message: "Emails required" });
    }

    // Query only the _id field for performance & privacy
    const users = await User.find({ email: { $in: emails } }, "_id");

    // Map to an array of ids
    const userIds = users.map((u) => u._id);

    res.json({ userIds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
