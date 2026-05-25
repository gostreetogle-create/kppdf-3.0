import mongoose, { Schema, Document } from 'mongoose';
import type { IOperation } from '../../../../shared/types/operation.interface';

export type OperationDocument = IOperation & Document;

const operationSchema = new Schema<OperationDocument>(
  {
    number: { type: Number },
    name: { type: String, required: true },
    workshop: { type: String },
    duration: { type: Number, default: 1 },
    costPerHour: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const OperationModel = mongoose.model<OperationDocument>('Operation', operationSchema);
