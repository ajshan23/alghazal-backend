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
    const {
      projectId,
      estimationId,
      validUntil,
      scopeOfWork,
      items,
      termsAndConditions,
      vatPercentage = 5,
    } = req.body;

    const exists = await Quotation.findOne({ project: projectId });
    if (exists) throw new ApiError(400, "Project already has a quotation");

    const processedItems = await Promise.all(
      items.map(async (item: any, index: number) => {
        // Type the files object properly
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        const fileKey = `items[${index}][image]`;

        if (files && files[fileKey] && files[fileKey][0]) {
          const uploadResult = await uploadItemImage(files[fileKey][0]);
          if (uploadResult.uploadData) {
            item.image = uploadResult.uploadData;
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
      preparedBy: req.user?._id,
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
        approvedBy: req.user?._id,
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
