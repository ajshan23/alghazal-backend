import express from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  updateProjectStatus,
  updateProjectProgress,
  deleteProject,
} from "../controllers/projectController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Create project - Admin/Engineer only
router.post(
  "/",
  authorize(["admin", "super_admin", "engineer"]),
  createProject
);

// Get all projects
router.get("/", getProjects);

// Get single project
router.get("/:id", getProject);

// Update project - Admin/Engineer only
router.put(
  "/:id",
  authorize(["admin", "super_admin", "engineer"]),
  updateProject
);

// Update project status
router.patch(
  "/:id/status",
  authorize(["admin", "super_admin", "engineer", "finance"]),
  updateProjectStatus
);

// Update project progress
router.patch(
  "/:id/progress",
  authorize(["admin", "super_admin", "engineer"]),
  updateProjectProgress
);

// Delete project - Admin only
router.delete("/:id", authorize(["admin", "super_admin"]), deleteProject);

export default router;
