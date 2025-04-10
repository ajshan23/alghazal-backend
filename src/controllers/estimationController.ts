import { Request, Response } from "express";

import { ApiResponse } from "../utils/apiHandlerHelpers";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiHandlerHelpers";
import { Estimation } from "../models/estimationModel";

export const createEstimation = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      clientName,
      workDescription,
      estimationNumber,
      materials,
      labourCharges,
      termsAndConditions,
      quotationAmount,
      commissionAmount,
      preparedByName,
      checkedByName,
      approvedByName,
    } = req.body;

    // Basic validation
    if (
      !clientName ||
      !workDescription ||
      !estimationNumber ||
      !materials?.length
    ) {
      throw new ApiError(400, "Required fields are missing");
    }

    const estimation = await Estimation.create({
      clientName,
      workDescription,
      estimationNumber,
      materials,
      labourCharges: labourCharges || [],
      termsAndConditions: termsAndConditions || [],
      quotationAmount,
      commissionAmount,
      preparedByName,
      checkedByName,
      approvedByName,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, estimation, "Estimation created successfully")
      );
  }
);
export const getEstimations = asyncHandler(
  async (req: Request, res: Response) => {
    // Parse query parameters with default values
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get total count of documents for pagination info
    const total = await Estimation.countDocuments({});

    const estimations = await Estimation.find({}).skip(skip).limit(limit);

    if (!estimations || estimations.length === 0) {
      throw new ApiError(404, "Estimations not found");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          estimations,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1,
          },
        },
        "Estimations retrieved successfully"
      )
    );
  }
);
export const getEstimation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      throw new ApiError(400, "Estimation ID is required");
    }
    const estimation = await Estimation.findById(id);

    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, estimation, "Estimation retrieved successfully")
      );
  }
);

export const generateEstimationReport = asyncHandler(
  async (req: Request, res: Response) => {
    const estimation = await Estimation.findById(req.params.id);

    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    // In a real app, you'd use a PDF generation library like pdfkit
    // Here we'll just return the data that would be used for the report
    const reportData = {
      ...estimation.toObject(),
      generatedDate: new Date(),
    };

    return res
      .status(200)
      .json(new ApiResponse(200, reportData, "Estimation report generated"));
  }
);
