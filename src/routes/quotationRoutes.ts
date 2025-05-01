import express from "express";
import {
  createQuotation,
  getQuotation,
  updateQuotationItemImage,
} from "../controllers/quotationController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { upload } from "../config/multer";

const router = express.Router();

router.use(authenticate);

// Create quotation
router.post(
  "/",
  authorize(["admin", "super_admin", "engineer"]),
  upload.any(), // Accepts multiple files with field names like "item-0-unitImage"
  createQuotation
);

// Get quotation
router.get(
  "/:id",
  authorize(["admin", "super_admin", "engineer", "finance"]),
  getQuotation
);

// Update item image
router.put(
  "/:quotationId/items/:itemIndex/image",
  authorize(["admin", "super_admin", "engineer"]),
  upload.single("unitImage"),
  updateQuotationItemImage
);

export default router;
