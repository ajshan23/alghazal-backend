import express from "express";
import {
  createQuotation,
  getQuotationByProject,
  updateQuotation,
  approveQuotation,
  deleteQuotation,
} from "../controllers/quotationController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { upload } from "../config/multer";

const router = express.Router();

router.use(authenticate);

// Create (engineers/admins)
router.post(
  "/",
  authorize(["admin", "super_admin", "engineer"]),
  upload.any(), // Handles dynamic item images
  createQuotation
);

// Get by project ID
router.get(
  "/project/:projectId",
  authorize(["admin", "super_admin", "engineer", "finance"]),
  getQuotationByProject
);

// Update (engineers/admins)
router.put(
  "/:id",
  authorize(["admin", "super_admin", "engineer"]),
  upload.any(), // Handles dynamic item images
  updateQuotation
);

// Approve/reject (admins only)
router.patch(
  "/:id/approval",
  authorize(["admin", "super_admin"]),
  approveQuotation
);

// Delete (admins only)
router.delete("/:id", authorize(["admin", "super_admin"]), deleteQuotation);

export default router;
