import Expense from "../model/expenseModel.js";
import Group from "../model/groupModel.js";
import mongoose from "mongoose";

// Add Expense (Splitwise logic)
// Add Expense (Splitwise logic)
export const addExpense = async (req, res) => {
  try {
    const { group, amount, expenseName, sharedWith, category } = req.body;

    // Logged-in user as owner
    const owner = req.user.id;

    if (!group || !amount || !expenseName || !sharedWith?.length) {
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

    // Splitwise calculation: equally split including owner
    const allUsers = [...sharedWith, owner];
    const n = allUsers.length;
    const shareAmount = amount / n;

    // Create sharedWith array for Expense model (exclude owner from negative amounts)
    const sharedWithArray = sharedWith.map((uid) => ({
      user: new mongoose.Types.ObjectId(uid),
      amount: -shareAmount,
    }));

    // Owner's positive share
    sharedWithArray.push({
      user: new mongoose.Types.ObjectId(owner),
      amount: amount - shareAmount * sharedWith.length,
    });

    // Create expense
    const expense = await Expense.create({
      group: new mongoose.Types.ObjectId(group),
      amount,
      owner: new mongoose.Types.ObjectId(owner),
      expenseName,
      description: expenseName,
      sharedWith: sharedWithArray,
      category,
    });

    // Save expense to group
    grp.expenses.push(expense._id);
    await grp.save();

    res.status(201).json({ message: "Expense added successfully", expense });
  } catch (err) {
    console.error("Error adding expense:", err);
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
    console.error("Error settling expense:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get Group Summary
export const getGroupSummary = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate("members", "_id name email")
      .populate({
        path: "expenses",
        populate: [
          { path: "owner", select: "_id name email" },
          { path: "sharedWith.user", select: "_id name email" },
        ],
      });

    if (!group) return res.status(404).json({ message: "Group not found" });

    const expenses = (group.expenses || []).map((exp) => ({
      expenseId: exp._id,
      expenseName: exp.expenseName,
      category: exp.category,
      amount: exp.amount,
      owner: exp.owner
        ? { _id: exp.owner._id, name: exp.owner.name, email: exp.owner.email }
        : { _id: null, name: "Unknown", email: "—" },
      sharedWith: (exp.sharedWith || [])
        .filter(
          (s) => s.user && (!exp.owner || !s.user._id.equals(exp.owner._id))
        )
        .map((s) => ({ _id: s.user._id, name: s.user.name || "Unknown" })),
    }));

    res.status(200).json({
      groupId: group._id,
      groupName: group.name,
      expenses,
    });
  } catch (err) {
    console.error("Error in getGroupSummary:", err);
    res.status(500).json({ message: err.message });
  }
};
