import express from "express";

import { authenticate, authorize } from "../middlewares/authMiddleware";
import {
  addProjectComment,
  getProjectActivity,
} from "../controllers/commentController";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get client by ID
router.get("/:projectId", addProjectComment);
router.post("/:projectId", getProjectActivity);

export default router;
