import { Document, Schema, model, Types } from "mongoose";
import { IProject } from "./projectModel";
import { IUser } from "./userModel";

interface IEstimationItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface IEstimation extends Document {
  project: Types.ObjectId | IProject;
  estimationNumber: string;
  workStartDate: Date;
  workEndDate: Date;
  validUntil: Date;
  paymentDueBy: number; // Number of days

  materials: IEstimationItem[];
  labour: {
    designation: string;
    days: number;
    price: number;
    total: number;
  }[];
  termsAndConditions: IEstimationItem[];

  estimatedAmount: number;
  quotationAmount?: number;
  commissionAmount?: number;
  profit?: number;

  preparedBy: Types.ObjectId | IUser;
  checkedBy?: Types.ObjectId | IUser;
  approvedBy?: Types.ObjectId | IUser;

  isChecked: boolean;
  isApproved: boolean;
  approvalComment?: string;

  createdAt: Date;
  updatedAt: Date;
}

const estimationItemSchema = new Schema<IEstimationItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
});

const estimationSchema = new Schema<IEstimation>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    estimationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    workStartDate: {
      type: Date,
      required: true,
    },
    workEndDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: IEstimation, value: Date) {
          return value > this.workStartDate;
        },
        message: "Work end date must be after start date",
      },
    },
    validUntil: {
      type: Date,
      required: true,
    },
    paymentDueBy: {
      type: Number,
      required: true,
      min: 0,
    },

    materials: [estimationItemSchema],
    labour: [
      {
        designation: { type: String, required: true },
        days: { type: Number, required: true, min: 0 },
        price: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],
    termsAndConditions: [estimationItemSchema],

    estimatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    quotationAmount: {
      type: Number,
      min: 0,
    },
    commissionAmount: {
      type: Number,
      min: 0,
    },
    profit: {
      type: Number,
    },

    preparedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    isChecked: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvalComment: {
      type: String,
    },
  },
  { timestamps: true }
);

// Calculate totals before saving
estimationSchema.pre<IEstimation>("save", function (next) {
  // Calculate materials total
  const materialsTotal = this.materials.reduce(
    (sum, item) => sum + item.total,
    0
  );

  // Calculate labour total
  const labourTotal = this.labour.reduce((sum, item) => sum + item.total, 0);

  // Calculate terms total
  const termsTotal = this.termsAndConditions.reduce(
    (sum, item) => sum + item.total,
    0
  );

  // Set estimated amount
  this.estimatedAmount = materialsTotal + labourTotal + termsTotal;

  // Calculate profit if quotation amount exists
  if (this.quotationAmount) {
    this.profit =
      this.quotationAmount -
      this.estimatedAmount -
      (this.commissionAmount || 0);
  }

  next();
});

// Indexes
estimationSchema.index({ project: 1 });
estimationSchema.index({ estimationNumber: 1 });
estimationSchema.index({ isApproved: 1 });
estimationSchema.index({ isChecked: 1 });
estimationSchema.index({ workStartDate: 1 });
estimationSchema.index({ workEndDate: 1 });

export const Estimation = model<IEstimation>("Estimation", estimationSchema);
