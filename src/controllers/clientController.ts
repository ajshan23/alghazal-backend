import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { ApiError } from "../utils/apiHandlerHelpers";
import { Client } from "../models/clientModel";

export const createClient = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      clientName,
      clientAddress,
      mobileNumber,
      telephoneNumber,
      trnNumber,
    } = req.body;

    // Validate required fields
    if (!clientName || !clientAddress || !mobileNumber || !trnNumber) {
      throw new ApiError(
        400,
        "Client name, address, mobile number and TRN are required"
      );
    }

    // Validate phone number formats
    if (!/^\+?[\d\s-]{6,}$/.test(mobileNumber)) {
      throw new ApiError(400, "Invalid mobile number format");
    }

    if (telephoneNumber && !/^\+?[\d\s-]{6,}$/.test(telephoneNumber)) {
      throw new ApiError(400, "Invalid telephone number format");
    }

    // Check if TRN already exists
    const existingClient = await Client.findOne({ trnNumber });
    if (existingClient) {
      throw new ApiError(400, "Client with this TRN already exists");
    }

    const client = await Client.create({
      clientName,
      clientAddress,
      mobileNumber,
      telephoneNumber,
      trnNumber,
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
      { mobileNumber: { $regex: req.query.search, $options: "i" } },
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
    const {
      clientName,
      clientAddress,
      mobileNumber,
      telephoneNumber,
      trnNumber,
    } = req.body;

    const client = await Client.findById(id);
    if (!client) {
      throw new ApiError(404, "Client not found");
    }

    // Validate phone number formats if provided
    if (mobileNumber && !/^\+?[\d\s-]{6,}$/.test(mobileNumber)) {
      throw new ApiError(400, "Invalid mobile number format");
    }

    if (telephoneNumber && !/^\+?[\d\s-]{6,}$/.test(telephoneNumber)) {
      throw new ApiError(400, "Invalid telephone number format");
    }

    // Check if TRN is being updated and conflicts with other clients
    if (trnNumber && trnNumber !== client.trnNumber) {
      const existingClient = await Client.findOne({
        trnNumber,
        _id: { $ne: id }, // Exclude current client
      });

      if (existingClient) {
        throw new ApiError(400, "Another client already uses this TRN");
      }
    }

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      {
        clientName: clientName || client.clientName,
        clientAddress: clientAddress || client.clientAddress,
        mobileNumber: mobileNumber || client.mobileNumber,
        telephoneNumber:
          telephoneNumber !== undefined
            ? telephoneNumber
            : client.telephoneNumber,
        trnNumber: trnNumber || client.trnNumber,
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

export const getClientByTrn = asyncHandler(
  async (req: Request, res: Response) => {
    const { trnNumber } = req.params;

    const client = await Client.findOne({ trnNumber }).populate(
      "createdBy",
      "firstName lastName email"
    );
    if (!client) {
      throw new ApiError(404, "Client not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, client, "Client retrieved successfully"));
  }
);
