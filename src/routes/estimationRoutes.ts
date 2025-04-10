import express from "express";
import {
  createEstimation,
  getEstimation,
  generateEstimationReport,
  getEstimations,
} from "../controllers/estimationController";

const router = express.Router();

router.post("/", createEstimation);
router.get("/", getEstimations);
router.get("/:id", getEstimation);
router.get("/:id/report", generateEstimationReport);

export default router;
