import express from "express";
import {
  createGroup,
  addMemberByEmailToGroup,
  getUserGroups,
  getGroupById,
  findEachmemberNameBalanceEmail,
} from "../controllers/groupController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getGroupBalanceDetails } from "../controllers/balanceController.js";
import { getGroupSummary } from "../controllers/expenseController.js";

const gprouter = express.Router();

// Create a new group
gprouter.post("/create", authMiddleware, createGroup);

// Add member by email
gprouter.patch("/add-member-by-email", authMiddleware, addMemberByEmailToGroup);

// Fetch all groups of the user
gprouter.get("/my-groups", authMiddleware, getUserGroups);

// Fetch all summaries
gprouter.get("/summary", authMiddleware, getGroupSummary);

// Fetch group by ID
gprouter.get("/:groupId", authMiddleware, getGroupById);

// ✅ Fetch each member’s name, email, and balance in the group
//this was used in the SummaryModal
// i designed the newer one because this was creating the redundancy with the getGroupBalanceDetails
gprouter.get(
  "/:groupId/balances",
  authMiddleware,
  findEachmemberNameBalanceEmail
);

// Balance details route (if used elsewhere)
gprouter.get(
  "/:groupId/balance-details",
  authMiddleware,
  getGroupBalanceDetails
);

gprouter.get("/:groupId/summary", authMiddleware, getGroupSummary);

export default gprouter;
