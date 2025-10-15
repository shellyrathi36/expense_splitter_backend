import mongoose from "mongoose";

const sharedWithSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
});

const expenseSchema = new mongoose.Schema({
  expenseName: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sharedWith: [sharedWithSchema], // now stores both user and their share
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  date: { type: Date, default: Date.now },
});

export default mongoose.model("Expense", expenseSchema);
