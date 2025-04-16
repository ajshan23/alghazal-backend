import { Document, Schema, model, Types } from "mongoose";

export interface IClient extends Document {
  clientName: string;
  clientAddress: string;
  clientNumbers: string[];
  trnNumber: string;
  vatNumber: string;
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
    clientNumbers: {
      type: [String],
      required: true,
      validate: {
        validator: (numbers: string[]) => numbers.length > 0,
        message: "At least one client number is required",
      },
    },
    trnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vatNumber: {
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

// Add index for frequently queried fields
clientSchema.index({ clientName: 1 });
clientSchema.index({ trnNumber: 1 });
clientSchema.index({ vatNumber: 1 });

export const Client = model<IClient>("Client", clientSchema);
