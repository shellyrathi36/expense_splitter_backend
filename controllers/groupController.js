// controllers/groupController.js
import Group from "../model/groupModel.js";
import User from "../model/userModel.js";
import mongoose from "mongoose";
import Expense from "../model/expenseModel.js";

// ---------------------------
// Create a new group by emails
// ---------------------------
export const createGroup = async (req, res) => {
  try {
    const { groupName, emails } = req.body;

    if (
      !groupName ||
      !emails ||
      !Array.isArray(emails) ||
      emails.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Group name and member emails are required" });
    }

    // Find users by email
    const users = await User.find({ email: { $in: emails } });
    if (users.length !== emails.length) {
      return res.status(400).json({ message: "Some emails are invalid" });
    }

    let memberIds = users.map((u) => u._id);

    // Include logged-in user automatically
    if (!memberIds.includes(req.user.id)) {
      memberIds.push(req.user.id);
    }
    //group array being uodated over here
    const group = new Group({
      name: groupName,
      members: memberIds,
      creator: req.user.id,
      expenses: [],
    });

    await group.save();

    // Add group reference to each user
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $addToSet: { groups: group._id } }
    );

    res.status(201).json({ message: "Group created successfully", group });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------
// Add a member by email to group
// ---------------------------
// Lets you add a new user (by email) to an existing group.

// Keeps the data consistent by updating both user and group collections.
export const addMemberByEmailToGroup = async (req, res) => {
  try {
    const { groupId, email } = req.body;

    if (!groupId || !email) {
      return res
        .status(400)
        .json({ message: "Group ID and member email are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: user._id } },
      { new: true }
    ).populate("members", "name email");

    if (!updatedGroup)
      return res.status(404).json({ message: "Group not found" });

    await User.findByIdAndUpdate(user._id, { $addToSet: { groups: groupId } });

    res
      .status(200)
      .json({ message: "Member added successfully", group: updatedGroup });
  } catch (error) {
    console.error("Error adding member by email:", error);
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------
// Get groups for logged-in user
// ---------------------------
// Fetches all the groups a user belongs to.

// Useful for the Dashboard or Group List in the frontend.
//extremely tricky faced lots of error in this
export const getUserGroups = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not found in request" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const groups = await Group.find({ members: userId })
      .populate("members", "name email")
      .lean();

    res.status(200).json({ groups: groups || [] });
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch groups", error: error.message });
  }
};

// ---------------------------
// Get group by ID
// ---------------------------

//for displaying the summary of a particular group id!!!
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).populate(
      "members",
      "name email"
    );

    if (!group) return res.status(404).json({ message: "Group not found" });

    res.status(200).json({ group });
  } catch (error) {
    console.error("Error fetching group by ID:", error);
    res.status(500).json({ message: error.message });
  }
};

// Core of the app’s logic — calculates how much each member owes or gets back.

// Reads all expenses, computes credits/debits, and prepares a balance summary.

// Used to show balances in the frontend (SummaryModal or Dashboard)

export const findEachmemberNameBalanceEmail = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.id; // from authMiddleware

    const group = await Group.findById(groupId).populate(
      "members",
      "name email"
    );
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Initialize balances with an array to store expense names
    const balances = {};
    group.members.forEach((member) => {
      balances[member._id.toString()] = {
        amount: 0,
        name: member.name,
        email: member.email,
        expenses: [], // track related expenses
      };
    });

    // Get all expenses in this group
    const expenses = await Expense.find({ group: groupId });
    for (const exp of expenses) {
      const share = exp.amount / exp.sharedWith.length;

      // Deduct from shared members
      exp.sharedWith.forEach((m) => {
        const id = m.user.toString();
        if (balances[id]) {
          balances[id].amount -= share;
          balances[id].expenses.push(exp.expenseName);
        }
      });

      // Credit to payer
      if (balances[exp.owner.toString()]) {
        balances[exp.owner.toString()].amount += exp.amount;
        balances[exp.owner.toString()].expenses.push(exp.expenseName);
      }
    }

    //clik on the group dashboard then these things are actually getting viviblied as welll

    // Prepare response
    const result = Object.entries(balances).map(([id, data]) => ({
      id,
      name: data.name,
      email: data.email,
      balance: Number(data.amount.toFixed(2)),
      expenses: [...new Set(data.expenses)], // remove duplicates
    }));

    res.status(200).json({ groupName: group.name, balances: result });
  } catch (error) {
    console.error("Error fetching member balances:", error);
    res.status(500).json({ message: "Server error fetching member balances" });
  }
};

// export const handleClearExpense = async (req, res) => {
//   try {
//     const { groupId, expenseId } = req.params;

//     // Validate params
//     if (!groupId || !expenseId) {
//       return res
//         .status(400)
//         .json({ message: "Both groupId and expenseId are required" });
//     }

//     // Check if group exists
//     const group = await Group.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Check if expense exists in that group
//     const expense = await Expense.findById(expenseId);
//     if (!expense) {
//       return res.status(404).json({ message: "Expense not found" });
//     }

//     // Remove expense from group.expenses array
//     group.expenses = group.expenses.filter(
//       (exp) => exp.toString() !== expenseId.toString()
//     );
//     await group.save();

//     // Delete expense document itself
//     await Expense.findByIdAndDelete(expenseId);

//     res.status(200).json({
//       message: "Expense cleared successfully",
//       groupId,
//       expenseId,
//     });
//   } catch (err) {
//     console.error("Error in handleClearExpense:", err);
//     res.status(500).json({ message: err.message });
//   }
// };

// export const clearMemberBalance = async (req, res) => {
//   try {
//     const { groupId, memberId } = req.params;

//     if (!groupId || !memberId) {
//       return res
//         .status(400)
//         .json({ message: "Both groupId and memberId are required" });
//     }

//     const group = await Group.findById(groupId).populate("expenses");
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     const expenses = await Expense.find({ group: groupId });

//     for (const expense of expenses) {
//       let updated = false;

//       // Update sharedWith safely
//       expense.sharedWith = expense.sharedWith
//         .filter((s) => s.user) // remove invalid
//         .map((s) => {
//           if (s.user.toString() === memberId) {
//             updated = true;
//             return { user: s.user, amount: 0 };
//           }
//           return { user: s.user, amount: s.amount };
//         });

//       if (expense.owner && expense.owner.toString() === memberId) {
//         updated = true;
//         expense.amount = 0;
//       }

//       if (updated) await expense.save();
//     }

//     res.status(200).json({
//       message: "Member balance cleared successfully",
//       groupId,
//       memberId,
//     });
//   } catch (err) {
//     console.error("Error in clearMemberBalance:", err);
//     res.status(500).json({ message: err.message });
//   }
// };
