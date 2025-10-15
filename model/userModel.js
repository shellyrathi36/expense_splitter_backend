import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
});

// ✅ Prevent model overwrite upon hot-reload or in development
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
