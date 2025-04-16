import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { ApiError } from "../utils/apiHandlerHelpers";
import { User } from "../models/userModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const SALT_ROUNDS = 10;

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, phoneNumbers, firstName, lastName, role } = req.body;

  if (
    !email ||
    !password ||
    !phoneNumbers ||
    !firstName ||
    !lastName ||
    !role
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "Email already in use");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    email,
    password: hashedPassword,
    phoneNumbers,
    firstName,
    lastName,
    role,
    createdBy: req.user?.userId,
  });

  const userResponse = user.toObject();
  // delete userResponse.password;

  res.status(201).json(new ApiResponse(201, {}, "User created successfully"));
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive) filter.isActive = req.query.isActive === "true";
  if (req.query.search) {
    filter.$or = [
      { firstName: { $regex: req.query.search, $options: "i" } },
      { lastName: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter, { password: 0 })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
      "Users retrieved successfully"
    )
  );
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Users can view their own profile, admins can view any
  if (
    user._id.toString() !== req.user?.userId &&
    req.user?.role !== "admin" &&
    req.user?.role !== "super_admin"
  ) {
    throw new ApiError(403, "Forbidden: Insufficient permissions");
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "User retrieved successfully"));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Users can update their own profile, admins can update any
  if (
    user._id.toString() !== req.user?.userId &&
    req.user?.role !== "admin" &&
    req.user?.role !== "super_admin"
  ) {
    throw new ApiError(403, "Forbidden: Insufficient permissions");
  }

  // Admins can change role, others can't
  if (
    updateData.role &&
    req.user?.role !== "admin" &&
    req.user?.role !== "super_admin"
  ) {
    throw new ApiError(403, "Forbidden: Only admins can change roles");
  }

  // Handle password update
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
  }

  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    select: "-password",
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Prevent self-deletion
  if (user._id.toString() === req.user?.userId) {
    throw new ApiError(400, "Cannot delete your own account");
  }

  await User.findByIdAndDelete(id);

  res.status(200).json(new ApiResponse(200, null, "User deleted successfully"));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find user by email
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(403, "Account is inactive. Please contact admin.");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Create JWT token
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    "alghaza_secret",
    { expiresIn: "7d" }
  );

  // Remove password from response
  const userResponse = user.toObject();
  // delete userResponse.password;

  // Set cookie (optional)
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
      },
      "Login successful"
    )
  );
});
