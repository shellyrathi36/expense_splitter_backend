import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./database/index.js";
import router from "./routes/userRoute.js";
import exrouter from "./routes/exRoute.js";
import gprouter from "./routes/groupRoutes.js";
import dashrouter from "./routes/dashRoute.js";
const PORT = 3000;
const app = express();
app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));
connectDB();
app.use("/api", router);
app.use("/api/expenses", exrouter);
app.use("/api/groups", gprouter);
app.use("/api/dashboard", dashrouter);
app.get("/", (req, res) => {
  res.send("API Working");
});

app.listen(PORT, () => console.log("Server running on port" + PORT));
