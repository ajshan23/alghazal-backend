import { Document, Schema, model, Types } from "mongoose";
import { IClient } from "./clientModel";

export interface IProject extends Document {
  projectName: string;
  projectDescription: string;
  client: Types.ObjectId | IClient;
  siteAddress: string;
  siteLocation: string; // Changed to string
  status:
    | "draft"
    | "estimation_prepared"
    | "quotation_sent"
    | "quotation_approved"
    | "contract_signed"
    | "work_started"
    | "in_progress"
    | "work_completed"
    | "quality_check"
    | "client_handover"
    | "final_invoice_sent"
    | "payment_received"
    | "project_closed"
    | "on_hold"
    | "cancelled";
  progress: number; 
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const projectSchema = new Schema<IProject>(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    projectDescription: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    siteAddress: {
      type: String,
      required: true,
      trim: true,
    },
    siteLocation: {
      type: String, // Changed to String
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "estimation_prepared",
        "quotation_sent",
        "quotation_approved",
        "contract_signed",
        "work_started",
        "in_progress",
        "work_completed",
        "quality_check",
        "client_handover",
        "final_invoice_sent",
        "payment_received",
        "project_closed",
        "on_hold",
        "cancelled",
      ],
      default: "draft",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes
projectSchema.index({ projectName: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ progress: 1 });

export const Project = model<IProject>("Project", projectSchema);
