import express from "express";
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  login,
} from "../controllers/userController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Create user - Admin only
router.post("/", authorize(["admin", "super_admin"]), createUser);

// Get all users - Admin + Finance
router.get("/", authorize(["admin", "super_admin", "finance"]), getUsers);

// Get single user
router.get("/:id", getUser);

// Update user
router.put("/:id", updateUser);

// Delete user - Admin only
router.delete("/:id", authorize(["admin", "super_admin"]), deleteUser);

router.post("/login", login);
export default router;
