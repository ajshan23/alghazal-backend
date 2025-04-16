import { Document, Schema, model, Types } from "mongoose";

export interface IClient extends Document {
  clientName: string;
  clientAddress: string;
  mobileNumber: string;
  telephoneNumber?: string; // Optional
  trnNumber: string;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const clientSchema = new Schema<IClient>(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    clientAddress: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    telephoneNumber: {
      type: String,
      trim: true,
    },
    trnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
clientSchema.index({ clientName: 1 });
clientSchema.index({ trnNumber: 1 });

export const Client = model<IClient>("Client", clientSchema);
