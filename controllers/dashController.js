// controllers/dashboardController.js
import Expense from "../model/expenseModel.js";
import User from "../model/userModel.js";
import Group from "../model/groupModel.js";

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id; // authenticated user from middleware

    // Fetch all groups that user is a member of
    const groups = await Group.find({ members: userId })
      .populate("members", "_id name email")
      .populate({
        path: "expenses",
        populate: { path: "sharedWith.user", select: "_id name email" },
      });

    const dashboardData = groups.map((grp) => {
      let owedByUser = 0;
      let owedToUser = 0;

      const memberBalances = {};

      grp.members.forEach((m) => {
        memberBalances[m._id.toString()] = {
          name: m.name,
          email: m.email,
          balance: 0,
        };
      });

      grp.expenses.forEach((exp) => {
        exp.sharedWith.forEach((s) => {
          if (!s || !s.user) return; // ✅ skip invalid records

          const uid = s.user._id
            ? s.user._id.toString()
            : typeof s.user === "string"
            ? s.user
            : s.user?.toString();

          if (!uid) return;

          const amt = s.amount || 0;

          if (memberBalances[uid]) {
            memberBalances[uid].balance += amt;
          }

          if (uid === userId.toString()) {
            if (amt < 0) owedByUser += -amt;
            else owedToUser += amt;
          }
        });
      });

      return {
        groupId: grp._id,
        groupName: grp.name,
        owedByUser,
        owedToUser,
        members: Object.values(memberBalances),
      };
    });

    res.status(200).json({ dashboard: dashboardData });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(510).json({ message: "Server Error", error: err.message });
  }
};
