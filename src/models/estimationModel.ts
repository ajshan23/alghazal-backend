import { Schema, model, Document } from "mongoose";

interface IMaterialItem {
  subjectMaterial: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ILabourItem {
  designation: string;
  quantityDays: number;
  price: number;
  total: number;
}

interface ITermsItem {
  miscellaneous: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface IEstimation extends Document {
  clientName: string;
  clientAddress: string;
  workDescription: string;
  dateOfEstimation: Date;
  workStartDate: Date;
  workEndDate: Date;
  validUntil: Date;
  paymentDueBy: Date;
  estimationNumber: string;
  status: string;

  materials: IMaterialItem[];
  totalMaterials: number;

  labourCharges: ILabourItem[];
  totalLabour: number;

  termsAndConditions: ITermsItem[];
  totalMisc: number;

  estimatedAmount: number;
  quotationAmount?: number;
  commissionAmount?: number;
  profit?: number;

  preparedByName: string;
  checkedByName: string;
  approvedByName: string;
}

const materialItemSchema = new Schema<IMaterialItem>({
  subjectMaterial: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true },
});

const labourItemSchema = new Schema<ILabourItem>({
  designation: { type: String, required: true },
  quantityDays: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
});

const termsItemSchema = new Schema<ITermsItem>({
  miscellaneous: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true },
});

const estimationSchema = new Schema<IEstimation>({
  clientName: { type: String, required: true },
  clientAddress: { type: String, required: true },
  workDescription: { type: String, required: true },
  dateOfEstimation: { type: Date, default: Date.now },
  workStartDate: { type: Date, required: true },
  workEndDate: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  paymentDueBy: { type: Date, required: true },
  estimationNumber: { type: String, required: true, unique: true },
  status: {
    type: String,
    default: "Draft",
    enum: ["Draft", "Sent", "Approved", "Rejected", "Converted"],
  },

  materials: [materialItemSchema],
  totalMaterials: { type: Number, default: 0 },

  labourCharges: [labourItemSchema],
  totalLabour: { type: Number, default: 0 },

  termsAndConditions: [termsItemSchema],
  totalMisc: { type: Number, default: 0 },

  estimatedAmount: { type: Number, default: 0 },
  quotationAmount: { type: Number },
  commissionAmount: { type: Number },
  profit: { type: Number },

  preparedByName: { type: String, required: true },
  checkedByName: { type: String, required: true },
  approvedByName: { type: String, required: true },
});

estimationSchema.pre<IEstimation>("save", function (next) {
  this.totalMaterials = this.materials.reduce(
    (sum, item) => sum + item.total,
    0
  );
  this.totalLabour = this.labourCharges.reduce(
    (sum, item) => sum + item.total,
    0
  );
  this.totalMisc = this.termsAndConditions.reduce(
    (sum, item) => sum + item.total,
    0
  );
  this.estimatedAmount =
    this.totalMaterials + this.totalLabour + this.totalMisc;

  if (this.quotationAmount && this.commissionAmount) {
    this.profit =
      this.quotationAmount - this.estimatedAmount - this.commissionAmount;
  }

  // Auto-generate estimation number if new
  if (this.isNew) {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const sequencePart = this.estimationNumber
      ? this.estimationNumber.slice(5)
      : "0001";
    this.estimationNumber = `EST${currentYear}${sequencePart}`;
  }

  next();
});

export const Estimation = model<IEstimation>("Estimation", estimationSchema);
