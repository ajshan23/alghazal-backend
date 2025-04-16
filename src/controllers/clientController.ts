import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { ApiError } from "../utils/apiHandlerHelpers";
import { Client } from "../models/clientModel";

export const createClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { clientName, clientAddress, clientNumbers, trnNumber, vatNumber } =
      req.body;

    // Validate required fields
    if (
      !clientName ||
      !clientAddress ||
      !clientNumbers ||
      !trnNumber ||
      !vatNumber
    ) {
      throw new ApiError(400, "All fields are required");
    }

    // Check if TRN or VAT number already exists
    const existingClient = await Client.findOne({
      $or: [{ trnNumber }, { vatNumber }],
    });

    if (existingClient) {
      throw new ApiError(
        400,
        "Client with this TRN or VAT number already exists"
      );
    }

    const client = await Client.create({
      clientName,
      clientAddress,
      clientNumbers,
      trnNumber,
      vatNumber,
      createdBy: req.user?.userId,
    });

    res
      .status(201)
      .json(new ApiResponse(201, client, "Client created successfully"));
  }
);

export const getClients = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const filter: any = {};

  // Search functionality
  if (req.query.search) {
    filter.$or = [
      { clientName: { $regex: req.query.search, $options: "i" } },
      { trnNumber: { $regex: req.query.search, $options: "i" } },
      { vatNumber: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const total = await Client.countDocuments(filter);
  const clients = await Client.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate("createdBy", "firstName lastName email");

  res.status(200).json(
    new ApiResponse(
      200,
      {
        clients,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
      "Clients retrieved successfully"
    )
  );
});

export const getClient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const client = await Client.findById(id).populate(
    "createdBy",
    "firstName lastName email"
  );
  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, client, "Client retrieved successfully"));
});

export const updateClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { clientName, clientAddress, clientNumbers, trnNumber, vatNumber } =
      req.body;

    const client = await Client.findById(id);
    if (!client) {
      throw new ApiError(404, "Client not found");
    }

    // Check if TRN or VAT number conflicts with other clients
    if (trnNumber || vatNumber) {
      const orConditions = [];

      if (trnNumber) orConditions.push({ trnNumber });
      if (vatNumber) orConditions.push({ vatNumber });

      const existingClient = await Client.findOne({
        $and: [
          { _id: { $ne: id } }, // Exclude current client
          { $or: orConditions },
        ],
      });

      if (existingClient) {
        throw new ApiError(
          400,
          "Another client already uses this TRN or VAT number"
        );
      }
    }

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      {
        clientName,
        clientAddress,
        clientNumbers,
        ...(trnNumber && { trnNumber }), // Only update if provided
        ...(vatNumber && { vatNumber }), // Only update if provided
      },
      { new: true }
    );

    res
      .status(200)
      .json(new ApiResponse(200, updatedClient, "Client updated successfully"));
  }
);

export const deleteClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const client = await Client.findByIdAndDelete(id);
    if (!client) {
      throw new ApiError(404, "Client not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, null, "Client deleted successfully"));
  }
);
