import express from "express";
import {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
} from "../controllers/clientController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Create client - Admin only
router.post("/", authorize(["admin", "super_admin"]), createClient);

// Get all clients
router.get("/", getClients);

// Get single client
router.get("/:id", getClient);

// Update client - Admin only
router.put("/:id", authorize(["admin", "super_admin"]), updateClient);

// Delete client - Admin only
router.delete("/:id", authorize(["admin", "super_admin"]), deleteClient);

export default router;
