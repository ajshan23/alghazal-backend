import { Document, Schema, model, Types } from "mongoose";

export interface IComment extends Document {
  content: string;
  user: Types.ObjectId;
  project: Types.ObjectId;
  actionType: "approval" | "rejection" | "check" | "general";
  createdAt?: Date;
  updatedAt?: Date;
}

const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    actionType: {
      type: String,
      enum: ["approval", "rejection", "check", "general"],
      required: true,
    },
  },
  { timestamps: true }
);

export const Comment = model<IComment>("Comment", commentSchema);
