import mongoose from "mongoose";

const MONGODB_URI = "mongodb://localhost:27017/expensesplitter"; // Change as needed

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
