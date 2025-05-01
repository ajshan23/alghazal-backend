import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { ApiError } from "../utils/apiHandlerHelpers";
import { Quotation } from "../models/quotationModel";
import { Project } from "../models/projectModel";
import { Estimation } from "../models/estimationModel";
import { uploadUnitImage, deleteFileFromS3 } from "../utils/uploadConf";

const generateQuotationNumber = async () => {
  const count = await Quotation.countDocuments();
  return `QTN-${new Date().getFullYear()}-${(count + 1)
    .toString()
    .padStart(4, "0")}`;
};

export const createQuotation = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      projectId,
      estimationId,
      validUntil,
      scopeOfWork,
      items,
      termsAndConditions,
      vatPercentage = 5,
    } = req.body;

    // Validate required fields
    if (
      !projectId ||
      !estimationId ||
      !validUntil ||
      !scopeOfWork ||
      !items ||
      !termsAndConditions
    ) {
      throw new ApiError(400, "Required fields are missing");
    }

    // Check if project and estimation exist
    const [project, estimation] = await Promise.all([
      Project.findById(projectId),
      Estimation.findById(estimationId),
    ]);

    if (!project) throw new ApiError(404, "Project not found");
    if (!estimation) throw new ApiError(404, "Estimation not found");

    // Process items with unit images if uploaded
    const processedItems = await Promise.all(
      items.map(async (item: any, index: number) => {
        const fileKey = `item-${index}-unitImage`;
        if (req.files && (req.files as any)[fileKey]) {
          const file = (req.files as any)[fileKey][0];
          const uploadResult = await uploadUnitImage(file);
          if (uploadResult.success && uploadResult.uploadData) {
            item.unitImage = uploadResult.uploadData;
          }
        }
        item.totalPrice = item.quantity * item.unitPrice;
        return item;
      })
    );

    const quotation = await Quotation.create({
      project: projectId,
      estimation: estimationId,
      quotationNumber: await generateQuotationNumber(),
      date: new Date(),
      validUntil: new Date(validUntil),
      scopeOfWork,
      items: processedItems,
      termsAndConditions,
      vatPercentage,
      preparedBy: req.user?.userId,
    });

    // Update project status
    await Project.findByIdAndUpdate(projectId, { status: "quotation_sent" });

    res
      .status(201)
      .json(new ApiResponse(201, quotation, "Quotation created successfully"));
  }
);

export const updateQuotationItemImage = asyncHandler(
  async (req: Request, res: Response) => {
    const { quotationId, itemIndex } = req.params;
    const file = req.file;

    if (!file) throw new ApiError(400, "No file uploaded");

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) throw new ApiError(404, "Quotation not found");

    const item = quotation.items[Number(itemIndex)];
    if (!item) throw new ApiError(404, "Item not found");

    // Delete old image if exists
    if (item.unitImage?.key) {
      await deleteFileFromS3(item.unitImage.url);
    }

    // Upload new image
    const uploadResult = await uploadUnitImage(file);
    if (!uploadResult.success || !uploadResult.uploadData) {
      throw new ApiError(500, "Failed to upload unit image");
    }

    // Update the item
    item.unitImage = uploadResult.uploadData;
    await quotation.save();

    res
      .status(200)
      .json(new ApiResponse(200, quotation, "Unit image updated successfully"));
  }
);

export const getQuotation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const quotation = await Quotation.findById(id)
      .populate("project", "projectName client")
      .populate("estimation", "estimationNumber")
      .populate("preparedBy", "firstName lastName")
      .populate("approvedBy", "firstName lastName");

    if (!quotation) {
      throw new ApiError(404, "Quotation not found");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, quotation, "Quotation retrieved successfully")
      );
  }
);
