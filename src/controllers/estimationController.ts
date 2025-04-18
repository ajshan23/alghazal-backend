import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { ApiError } from "../utils/apiHandlerHelpers";
import { Estimation } from "../models/estimationModel";
import { Project } from "../models/projectModel";
import { Types } from "mongoose";

// Helper function to generate document numbers
const generateEstimationNumber = async () => {
  const count = await Estimation.countDocuments();
  return `EST-${new Date().getFullYear()}-${(count + 1)
    .toString()
    .padStart(4, "0")}`;
};

export const createEstimation = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      project,
      workStartDate,
      workEndDate,
      validUntil,
      paymentDueBy,
      materials,
      labour,
      termsAndConditions,
      quotationAmount,
      commissionAmount,
    } = req.body;

    // Validate required fields
    if (
      !project ||
      !workStartDate ||
      !workEndDate ||
      !validUntil ||
      !paymentDueBy
    ) {
      throw new ApiError(400, "Required fields are missing");
    }

    if (
      (!materials || materials.length === 0) &&
      (!labour || labour.length === 0) &&
      (!termsAndConditions || termsAndConditions.length === 0)
    ) {
      throw new ApiError(
        400,
        "At least one item (materials, labour, or terms) is required"
      );
    }

    // Check if project exists
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      throw new ApiError(404, "Project not found");
    }

    // Create estimation (totals will be calculated in pre-save hook)
    const estimation = await Estimation.create({
      project,
      estimationNumber: await generateEstimationNumber(),
      workStartDate: new Date(workStartDate),
      workEndDate: new Date(workEndDate),
      validUntil: new Date(validUntil),
      paymentDueBy,
      materials,
      labour,
      termsAndConditions,
      quotationAmount,
      commissionAmount,
      preparedBy: req.user?.userId,
      isChecked: false,
      isApproved: false,
    });

    res
      .status(201)
      .json(
        new ApiResponse(201, estimation, "Estimation created successfully")
      );
  }
);

export const markAsChecked = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const checkedById = req.user?.userId;

    if (!checkedById) {
      throw new ApiError(404, "User not found");
    }

    const estimation = await Estimation.findById(id);
    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    if (estimation.isChecked) {
      throw new ApiError(400, "Estimation is already checked");
    }

    estimation.isChecked = true;
    estimation.checkedBy = new Types.ObjectId(checkedById); // Convert string to ObjectId
    if (comment) estimation.approvalComment = comment;

    await estimation.save();

    res
      .status(200)
      .json(new ApiResponse(200, estimation, "Estimation marked as checked"));
  }
);

export const approveEstimation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { comment, approved } = req.body;
    const approvedBy = req.user?.userId;
    if (!approvedBy) {
      throw new ApiError(404, "User not found");
    }
    if (typeof approved !== "boolean") {
      throw new ApiError(400, "Approval status is required");
    }

    const estimation = await Estimation.findById(id);
    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    if (!estimation.isChecked) {
      throw new ApiError(400, "Estimation must be checked before approval");
    }

    if (estimation.isApproved) {
      throw new ApiError(400, "Estimation is already approved");
    }

    estimation.isApproved = approved;
    estimation.approvedBy = new Types.ObjectId(approvedBy);
    estimation.approvalComment = comment;
    await estimation.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          estimation,
          `Estimation ${approved ? "approved" : "rejected"}`
        )
      );
  }
);

export const getEstimationsByProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { status } = req.query;

    const filter: any = { project: projectId };
    if (status === "checked") filter.isChecked = true;
    if (status === "approved") filter.isApproved = true;
    if (status === "pending") filter.isChecked = false;

    const estimations = await Estimation.find(filter)
      .populate("preparedBy", "firstName lastName")
      .populate("checkedBy", "firstName lastName")
      .populate("approvedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json(
        new ApiResponse(200, estimations, "Estimations retrieved successfully")
      );
  }
);

export const getEstimationDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const estimation = await Estimation.findById(id)
      .populate("project", "projectName client")
      .populate("preparedBy", "firstName lastName")
      .populate("checkedBy", "firstName lastName")
      .populate("approvedBy", "firstName lastName");

    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, estimation, "Estimation details retrieved"));
  }
);

export const updateEstimation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const estimation = await Estimation.findById(id);
    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    if (estimation.isApproved) {
      throw new ApiError(400, "Cannot update approved estimation");
    }

    // Reset checked status if updating
    if (estimation.isChecked) {
      estimation.isChecked = false;
      estimation.checkedBy = undefined;
      estimation.approvalComment = undefined;
    }

    // Don't allow changing these fields directly
    delete updateData.isApproved;
    delete updateData.approvedBy;
    delete updateData.estimatedAmount;
    delete updateData.profit;

    // Update fields
    estimation.set(updateData);
    await estimation.save();

    res
      .status(200)
      .json(
        new ApiResponse(200, estimation, "Estimation updated successfully")
      );
  }
);

export const deleteEstimation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const estimation = await Estimation.findById(id);
    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    if (estimation.isApproved) {
      throw new ApiError(400, "Cannot delete approved estimation");
    }

    await Estimation.findByIdAndDelete(id);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Estimation deleted successfully"));
  }
);
