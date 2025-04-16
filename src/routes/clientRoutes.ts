import express from "express";
import {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  getClientByTrn,
} from "../controllers/clientController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Create client - Admin only
router.post("/", authorize(["admin", "super_admin"]), createClient);

// Get all clients (accessible to all authenticated users)
router.get("/", getClients);

// Get client by ID (accessible to all authenticated users)
router.get("/:id", getClient);

// Get client by TRN number (accessible to all authenticated users)
router.get("/trn/:trnNumber", getClientByTrn);

// Update client - Admin only
router.put("/:id", authorize(["admin", "super_admin"]), updateClient);

// Delete client - Admin only
router.delete("/:id", authorize(["admin", "super_admin"]), deleteClient);

export default router;
