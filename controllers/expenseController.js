// controllers/expenseController.js
import Expense from "../model/expenseModel.js";
import Group from "../model/groupModel.js";
import mongoose from "mongoose";

// Add Expense (Splitwise logic with amounts in sharedWith)
export const addExpense = async (req, res) => {
  try {
    const { group, amount, owner, expenseName, sharedWith, category } =
      req.body;

    // Validate required fields
    if (!group || !amount || !owner || !expenseName || !sharedWith?.length) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check group exists
    const grp = await Group.findById(group).populate("members", "_id name");
    if (!grp) return res.status(404).json({ message: "Group not found" });

    // Validate sharedWith users are in group
    const invalidMembers = sharedWith.filter(
      (id) => !grp.members.some((m) => m._id.toString() === id)
    );
    if (invalidMembers.length > 0)
      return res.status(400).json({ message: "Some users not in this group" });

    // Splitwise calculation
    const n = sharedWith.length;
    const shareAmount = amount / n;

    // Create sharedWith array with amount per user
    const sharedWithArray = sharedWith.map((uid) => ({
      user: uid,
      amount: uid === owner ? amount - shareAmount : -shareAmount,
    }));

    // Create balances object for frontend
    const balances = {};
    sharedWithArray.forEach((s) => {
      balances[s.user] = s.amount;
    });

    // Create expense
    const expense = await Expense.create({
      group,
      amount,
      owner,
      expenseName,
      description: expenseName,
      sharedWith: sharedWithArray,
      category,
    });

    // Save expense to group
    grp.expenses.push(expense._id);
    await grp.save();

    res
      .status(201)
      .json({ message: "Expense added successfully", expense, balances });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Settle Expense
export const settleExpense = async (req, res) => {
  try {
    const { expenseId } = req.body;

    if (!expenseId)
      return res.status(400).json({ message: "Expense ID is required" });

    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    // Set all sharedWith amounts to 0 (settled)
    expense.sharedWith = expense.sharedWith.map((s) => ({ ...s, amount: 0 }));
    await expense.save();

    res.status(200).json({ message: "Expense settled successfully", expense });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getGroupSummary = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: user not found" });
    }

    // use `new` when constructing ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const groups = await Group.find({ members: userId })
      .populate("members", "_id name email")
      .populate({
        path: "expenses",
        populate: [
          { path: "owner", select: "_id name email" },
          { path: "sharedWith.user", select: "_id name email" },
        ],
      });

    const summary = groups.map((grp) => {
      let owedByUser = 0;
      let owedToUser = 0;

      (grp.expenses || []).forEach((exp) => {
        const totalMembers = exp.sharedWith?.length || 1;
        const sharePerMember = (exp.amount || 0) / totalMembers;

        (exp.sharedWith || []).forEach((s) => {
          // s.user can be either an Object with _id (when populated) or a raw id string
          const sUserId =
            s.user && s.user._id ? s.user._id.toString() : String(s.user);
          const ownerId =
            exp.owner && exp.owner._id
              ? exp.owner._id.toString()
              : String(exp.owner);

          if (sUserId === userId.toString()) {
            if (ownerId === userId.toString()) {
              // user paid; others owe them
              owedToUser += sharePerMember * (totalMembers - 1);
            } else {
              // user owes owner
              owedByUser += sharePerMember;
            }
          }
        });
      });

      return {
        groupId: grp._id,
        groupName: grp.name,
        owedByUser: Number(owedByUser.toFixed(2)),
        owedToUser: Number(owedToUser.toFixed(2)),
        members: grp.members,
      };
    });

    res.status(200).json({ summary });
  } catch (err) {
    console.error("Error in getGroupSummary:", err);
    res.status(500).json({ message: err.message });
  }
};
