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

router.post(
  "/",
  authorize(["admin", "super_admin", "engineer"]),
  upload.any(),
  createQuotation
);

router.get(
  "/project/:projectId",
  authorize(["admin", "super_admin", "engineer", "finance"]),
  getQuotationByProject
);

router.put(
  "/:id",
  authorize(["admin", "super_admin", "engineer"]),
  upload.any(),
  updateQuotation
);

router.patch(
  "/:id/approval",
  authorize(["admin", "super_admin"]),
  approveQuotation
);

router.delete("/:id", authorize(["admin", "super_admin"]), deleteQuotation);

export default router;
