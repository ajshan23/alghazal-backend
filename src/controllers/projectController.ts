import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { ApiError } from "../utils/apiHandlerHelpers";
import { Project } from "../models/projectModel";
import { Client } from "../models/clientModel";
import { Estimation } from "../models/estimationModel";

// Status transition validation
const validStatusTransitions: Record<string, string[]> = {
  draft: ["estimation_prepared"],
  estimation_prepared: ["quotation_sent", "on_hold", "cancelled"],
  quotation_sent: [
    "quotation_approved",
    "quotation_rejected",
    "on_hold",
    "cancelled",
  ],
  quotation_approved: ["contract_signed", "on_hold", "cancelled"],
  contract_signed: ["work_started", "on_hold", "cancelled"],
  work_started: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["work_completed", "on_hold", "cancelled"],
  work_completed: ["quality_check", "on_hold"],
  quality_check: ["client_handover", "work_completed"],
  client_handover: ["final_invoice_sent", "on_hold"],
  final_invoice_sent: ["payment_received", "on_hold"],
  payment_received: ["project_closed"],
  on_hold: ["in_progress", "work_started", "cancelled"],
  cancelled: [],
  project_closed: [],
};

export const createProject = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      projectName,
      projectDescription,
      client,
      siteAddress,
      siteLocation,
    } = req.body;

    // Validate required fields
    if (!projectName || !client || !siteAddress || !siteLocation) {
      throw new ApiError(400, "Required fields are missing");
    }

    // Check if client exists
    const clientExists = await Client.findById(client);
    if (!clientExists) {
      throw new ApiError(404, "Client not found");
    }

    const project = await Project.create({
      projectName,
      projectDescription,
      client,
      siteAddress,
      siteLocation,
      status: "draft",
      progress: 0,
      createdBy: req.user?.userId,
    });

    res
      .status(201)
      .json(new ApiResponse(201, project, "Project created successfully"));
  }
);

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Build filter
  const filter: any = {};

  // Status filter
  if (req.query.status) {
    filter.status = req.query.status;
  }

  // Client filter
  if (req.query.client) {
    filter.client = req.query.client;
  }

  // Search functionality
  if (req.query.search) {
    const searchTerm = req.query.search as string;
    filter.$or = [
      { projectName: { $regex: searchTerm, $options: "i" } },
      { projectDescription: { $regex: searchTerm, $options: "i" } },
      { siteAddress: { $regex: searchTerm, $options: "i" } },
      { siteLocation: { $regex: searchTerm, $options: "i" } },
    ];
  }

  const total = await Project.countDocuments(filter);

  const projects = await Project.find(filter)
    .populate("client", "clientName clientAddress mobileNumber")
    .populate("createdBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        projects,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
      "Projects retrieved successfully"
    )
  );
});
export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const project = await Project.findById(id)
    .populate("client")
    .populate("createdBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email");

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Check if an estimation exists for this project
  const estimation = await Estimation.findOne({ project: id }).select("_id");

  // Create the response object
  const responseData = {
    ...project.toObject(),
    estimationId: estimation?._id || null,
  };

  res
    .status(200)
    .json(new ApiResponse(200, responseData, "Project retrieved successfully"));
});

export const updateProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    // Add updatedBy automatically
    updateData.updatedBy = req.user?.userId;

    const project = await Project.findById(id);
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Validate progress (0-100)
    if (updateData.progress !== undefined) {
      if (updateData.progress < 0 || updateData.progress > 100) {
        throw new ApiError(400, "Progress must be between 0 and 100");
      }
    }

    // Update status with validation
    if (updateData.status) {
      if (
        !validStatusTransitions[project.status]?.includes(updateData.status)
      ) {
        throw new ApiError(
          400,
          `Invalid status transition from ${project.status} to ${updateData.status}`
        );
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("client", "clientName clientAddress mobileNumber")
      .populate("updatedBy", "firstName lastName email");

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedProject, "Project updated successfully")
      );
  }
);

export const updateProjectStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new ApiError(400, "Status is required");
    }

    const project = await Project.findById(id);
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Validate status transition
    if (!validStatusTransitions[project.status]?.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status transition from ${project.status} to ${status}`
      );
    }

    const updateData: any = {
      status,
      updatedBy: req.user?.userId,
    };

    const updatedProject = await Project.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedProject,
          "Project status updated successfully"
        )
      );
  }
);

export const assignProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { assignedTo } = req.body;
    if (!assignedTo || !id) {
      throw new ApiError(400, "AssignedTo is required");
    }
    const project = await Project.findById(id);
    if (!project) {
      throw new ApiError(400, "Project not found");
    }
    const engineerExists = await Project.findById(assignedTo);
    if (!engineerExists) {
      throw new ApiError(400, "Engineer not found");
    }
    project.assignedTo = assignedTo;
    res
      .status(200)
      .json(new ApiResponse(200, {}, "Project assigned updated successfully"));
  }
);

export const updateProjectProgress = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { progress } = req.body;

    if (progress === undefined || progress < 0 || progress > 100) {
      throw new ApiError(400, "Progress must be between 0 and 100");
    }

    const project = await Project.findById(id);
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    const updateData: any = {
      progress,
      updatedBy: req.user?.userId,
    };

    // Auto-update status if progress reaches 100%
    if (progress === 100 && project.status !== "work_completed") {
      updateData.status = "work_completed";
    }

    const updatedProject = await Project.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedProject,
          "Project progress updated successfully"
        )
      );
  }
);

export const deleteProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Prevent deletion if project is beyond draft stage
    if (project.status !== "draft") {
      throw new ApiError(400, "Cannot delete project that has already started");
    }

    await Project.findByIdAndDelete(id);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Project deleted successfully"));
  }
);
