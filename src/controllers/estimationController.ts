import { Request, Response } from "express";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiHandlerHelpers";
import { Estimation } from "../models/estimationModel";

export const createEstimation = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      clientName,
      clientAddress,
      workDescription,
      dateOfEstimation,
      workStartDate,
      workEndDate,
      validUntil,
      paymentDueBy,
      status,
      materials,
      labourCharges,
      termsAndConditions,
      quotationAmount,
      commissionAmount,
      preparedByName,
      checkedByName,
      approvedByName,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      clientName, clientAddress, workDescription, dateOfEstimation,
      workStartDate, workEndDate, validUntil, paymentDueBy,
      preparedByName, checkedByName, approvedByName
    ];
    
    if (requiredFields.some(field => !field) || !materials?.length) {
      throw new ApiError(400, "Required fields are missing");
    }

    // Validate date sequence
    if (new Date(workStartDate) < new Date(dateOfEstimation)) {
      throw new ApiError(400, "Work start date cannot be before estimation date");
    }
    if (new Date(workEndDate) < new Date(workStartDate)) {
      throw new ApiError(400, "Work end date cannot be before work start date");
    }
    if (new Date(validUntil) < new Date(dateOfEstimation)) {
      throw new ApiError(400, "Valid until date cannot be before estimation date");
    }

    // Generate estimation number
    const latestEstimation = await Estimation.findOne()
      .sort({ estimationNumber: -1 })
      .limit(1);

    let nextSequence = 1;
    const currentYear = new Date().getFullYear().toString().slice(-2);

    if (latestEstimation) {
      const latestNumber = latestEstimation.estimationNumber;
      const latestSequence = parseInt(latestNumber.slice(5));

      if (!isNaN(latestSequence)) {
        nextSequence = latestSequence + 1;
      }
    }

    const sequencePart = nextSequence.toString().padStart(4, "0");
    const estimationNumber = `EST${currentYear}${sequencePart}`;

    const estimation = await Estimation.create({
      clientName,
      clientAddress,
      workDescription,
      dateOfEstimation,
      workStartDate,
      workEndDate,
      validUntil,
      paymentDueBy,
      status: status || 'Draft',
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

// Similarly update the updateEstimation controller
export const updateEstimation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      clientName,
      clientAddress,
      workDescription,
      dateOfEstimation,
      workStartDate,
      workEndDate,
      validUntil,
      paymentDueBy,
      status,
      materials,
      labourCharges,
      termsAndConditions,
      quotationAmount,
      commissionAmount,
      preparedByName,
      checkedByName,
      approvedByName,
    } = req.body;

    if (!id) {
      throw new ApiError(400, "Estimation ID is required");
    }

    // Validate date sequence
    if (new Date(workStartDate) < new Date(dateOfEstimation)) {
      throw new ApiError(400, "Work start date cannot be before estimation date");
    }
    if (new Date(workEndDate) < new Date(workStartDate)) {
      throw new ApiError(400, "Work end date cannot be before work start date");
    }
    if (new Date(validUntil) < new Date(dateOfEstimation)) {
      throw new ApiError(400, "Valid until date cannot be before estimation date");
    }

    const estimation = await Estimation.findByIdAndUpdate(
      id,
      {
        clientName,
        clientAddress,
        workDescription,
        dateOfEstimation,
        workStartDate,
        workEndDate,
        validUntil,
        paymentDueBy,
        status,
        materials,
        labourCharges,
        termsAndConditions,
        quotationAmount,
        commissionAmount,
        preparedByName,
        checkedByName,
        approvedByName,
      },
      { new: true }
    );

    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, estimation, "Estimation updated successfully")
      );
  }
);

export const getEstimations = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

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

// export const updateEstimation = asyncHandler(
//   async (req: Request, res: Response) => {
//     const { id } = req.params;
//     const {
//       clientName,
//       clientAddress,
//       workDescription,
//       materials,
//       labourCharges,
//       termsAndConditions,
//       quotationAmount,
//       commissionAmount,
//       preparedByName,
//       checkedByName,
//       approvedByName,
//     } = req.body;

//     if (!id) {
//       throw new ApiError(400, "Estimation ID is required");
//     }

//     const estimation = await Estimation.findByIdAndUpdate(
//       id,
//       {
//         clientName,
//         clientAddress,
//         workDescription,
//         materials,
//         labourCharges,
//         termsAndConditions,
//         quotationAmount,
//         commissionAmount,
//         preparedByName,
//         checkedByName,
//         approvedByName,
//       },
//       { new: true }
//     );

//     if (!estimation) {
//       throw new ApiError(404, "Estimation not found");
//     }

//     return res
//       .status(200)
//       .json(
//         new ApiResponse(200, estimation, "Estimation updated successfully")
//       );
//   }
// );

export const deleteEstimation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Estimation ID is required");
    }

    const estimation = await Estimation.findByIdAndDelete(id);

    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Estimation deleted successfully"));
  }
);

export const generateEstimationReport = asyncHandler(
  async (req: Request, res: Response) => {
    const estimation = await Estimation.findById(req.params.id);

    if (!estimation) {
      throw new ApiError(404, "Estimation not found");
    }

    const reportData = {
      ...estimation.toObject(),
      generatedDate: new Date(),
    };

    return res
      .status(200)
      .json(new ApiResponse(200, reportData, "Estimation report generated"));
  }
);
