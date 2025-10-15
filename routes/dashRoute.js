// routes/dashboardRoutes.js
import express from "express";
import { getDashboard } from "../controllers/dashController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const dashrouter = express.Router();

// GET /api/dashboard
dashrouter.get("/dash", authMiddleware, getDashboard);

export default dashrouter;
