// routes/expenseRoutes.js
import express from "express";
import {
  addExpense,
  getGroupSummary,
  settleExpense,
} from "../controllers/expenseController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add", authMiddleware, addExpense);
export default router;
