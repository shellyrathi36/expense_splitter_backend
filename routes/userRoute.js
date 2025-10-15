import express from "express";
import {
  loginUser,
  registerUser,
  getUserData,
} from "../controllers/userController.js";
const router = express.Router();
import { getUserIdsByEmail } from "../controllers/userController.js";

// Register a new user
router.post("/register", registerUser);

// Login user
router.post("/login", loginUser);
router.get("/:id", getUserData);
router.post("/get-ids-by-email", getUserIdsByEmail);

export default router;
