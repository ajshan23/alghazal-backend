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
  workDescription: string;
  dateOfEstimation: Date;
  estimationNumber: string;

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
  workDescription: { type: String, required: true },
  dateOfEstimation: { type: Date, default: Date.now },
  estimationNumber: { type: String, required: true, unique: true },

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

// Auto-calculate totals before saving
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

  next();
});

export const Estimation = model<IEstimation>("Estimation", estimationSchema);
