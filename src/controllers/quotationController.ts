import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { ApiError } from "../utils/apiHandlerHelpers";
import { Quotation } from "../models/quotationModel";
import { Project } from "../models/projectModel";
import { Estimation } from "../models/estimationModel";
import { uploadItemImage, deleteFileFromS3 } from "../utils/uploadConf";

const generateQuotationNumber = async () => {
  const count = await Quotation.countDocuments();
  return `QTN-${new Date().getFullYear()}-${(count + 1)
    .toString()
    .padStart(4, "0")}`;
};

export const createQuotation = asyncHandler(
  async (req: Request, res: Response) => {
    // Debugging logs
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    if (!req.files || !Array.isArray(req.files)) {
      throw new ApiError(400, "No files were uploaded");
    }

    // Parse the JSON data from form-data
    let jsonData;
    try {
      jsonData = JSON.parse(req.body.data);
    } catch (error) {
      throw new ApiError(400, "Invalid JSON data format");
    }

    const {
      project: projectId,
      validUntil,
      scopeOfWork = [],
      items = [],
      termsAndConditions = [],
      vatPercentage = 5,
    } = jsonData;

    // Validate items is an array
    if (!Array.isArray(items)) {
      throw new ApiError(400, "Items must be an array");
    }

    // Check for existing quotation
    const exists = await Quotation.findOne({ project: projectId });
    if (exists) throw new ApiError(400, "Project already has a quotation");

    const estimation = await Estimation.findOne({ project: projectId });
    const estimationId = estimation?._id;

    // Process items with their corresponding files
    const processedItems = await Promise.all(
      items.map(async (item: any, index: number) => {
        // Find the image file for this item using the correct fieldname pattern
        const imageFile = (req.files as Express.Multer.File[]).find(
          (f) => f.fieldname === `items[${index}][image]`
        );

        if (imageFile) {
          console.log(`Processing image for item ${index}:`, imageFile);
          const uploadResult = await uploadItemImage(imageFile);
          if (uploadResult.uploadData) {
            item.image = uploadResult.uploadData;
          }
        } else {
          console.log(`No image found for item ${index}`);
        }

        item.totalPrice = item.quantity * item.unitPrice;
        return item;
      })
    );

    // Calculate financial totals
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    const vatAmount = subtotal * (vatPercentage / 100);
    const total = subtotal + vatAmount;

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
      subtotal,
      vatAmount,
      total,
      preparedBy: req.user?.userId,
    });

    await Project.findByIdAndUpdate(projectId, { status: "quotation_sent" });

    res.status(201).json(new ApiResponse(201, quotation, "Quotation created"));
  }
);

export const getQuotationByProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const quotation = await Quotation.findOne({ project: projectId })
      .populate("project", "projectName")
      .populate("preparedBy", "firstName lastName");

    if (!quotation) throw new ApiError(404, "Quotation not found");
    res
      .status(200)
      .json(new ApiResponse(200, quotation, "Quotation retrieved"));
  }
);

export const updateQuotation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { items, ...updateData } = req.body;

    const quotation = await Quotation.findById(id);
    if (!quotation) throw new ApiError(404, "Quotation not found");

    if (items) {
      quotation.items = await Promise.all(
        items.map(async (item: any, index: number) => {
          // Type the files object properly
          const files = req.files as
            | { [fieldname: string]: Express.Multer.File[] }
            | undefined;
          const fileKey = `items[${index}][image]`;

          if (files?.[fileKey]?.[0]) {
            // Delete old image if it exists
            if (item.image?.key) {
              await deleteFileFromS3(item.image.key);
            }

            // Upload new image
            const uploadResult = await uploadItemImage(files[fileKey][0]);
            if (uploadResult.uploadData) {
              item.image = uploadResult.uploadData;
            }
          }

          // Calculate total price
          item.totalPrice = item.quantity * item.unitPrice;
          return item;
        })
      );
    }

    Object.assign(quotation, updateData);
    await quotation.save();

    res.status(200).json(new ApiResponse(200, quotation, "Quotation updated"));
  }
);

export const approveQuotation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isApproved, comment } = req.body;

    const quotation = await Quotation.findByIdAndUpdate(
      id,
      {
        isApproved,
        approvalComment: comment,
        approvedBy: req.user?.userId,
      },
      { new: true }
    );

    await Project.findByIdAndUpdate(quotation?.project, {
      status: isApproved ? "quotation_approved" : "quotation_rejected",
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          quotation,
          `Quotation ${isApproved ? "approved" : "rejected"}`
        )
      );
  }
);

export const deleteQuotation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const quotation = await Quotation.findByIdAndDelete(id);

    if (!quotation) throw new ApiError(404, "Quotation not found");

    await Promise.all(
      quotation.items.map((item) =>
        item.image?.key ? deleteFileFromS3(item.image.key) : Promise.resolve()
      )
    );

    await Project.findByIdAndUpdate(quotation.project, {
      status: "estimation_prepared",
    });

    res.status(200).json(new ApiResponse(200, null, "Quotation deleted"));
  }
);
