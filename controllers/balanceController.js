import Group from "../model/groupModel.js";

export const getGroupBalanceDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;

    if (!groupId)
      return res.status(400).json({ message: "Group ID is required" });

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

    // --- Step 1: collect all owed entries ---
    const rawDetails = [];

    group.expenses.forEach((exp) => {
      if (!exp.owner) return;

      exp.sharedWith.forEach((s) => {
        if (!s.user) return;

        const sharedUserId = s.user._id.toString();
        const ownerId = exp.owner._id.toString();
        const currentUserId = userId.toString();

        if (s.amount === 0) return;

        // Logged-in user is owner → others owe money to them
        if (
          ownerId === currentUserId &&
          sharedUserId !== currentUserId &&
          s.amount < 0
        ) {
          rawDetails.push({
            userId: s.user._id.toString(),
            name: s.user.name,
            email: s.user.email,
            amount: -s.amount, // positive → to receive
          });
        }

        // Logged-in user owes money to owner
        if (
          sharedUserId === currentUserId &&
          ownerId !== currentUserId &&
          s.amount < 0
        ) {
          rawDetails.push({
            userId: exp.owner._id.toString(),
            name: exp.owner.name,
            email: exp.owner.email,
            amount: s.amount, // negative → to pay
          });
        }
      });
    });

    const aggregated = {};
    rawDetails.forEach((entry) => {
      if (!aggregated[entry.userId]) {
        aggregated[entry.userId] = {
          id: entry.userId,
          name: entry.name,
          email: entry.email,
          netAmount: 0,
        };
      }
      aggregated[entry.userId].netAmount += entry.amount;
    });

    // --- Step 3: prepare clean array for response ---
    const balanceDetails = Object.values(aggregated).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      amount: Math.abs(u.netAmount),
      type: u.netAmount >= 0 ? "owedToUser" : "owedByUser",
    }));

    res.status(200).json({
      groupId: group._id,
      groupName: group.name,
      balanceDetails,
    });
  } catch (err) {
    console.error("Error in getGroupBalanceDetails:", err);
    res.status(500).json({ message: err.message });
  }
};
