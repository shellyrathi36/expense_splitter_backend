// models/Group.js
import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Expense" }],
});

export default mongoose.model("Group", groupSchema);
