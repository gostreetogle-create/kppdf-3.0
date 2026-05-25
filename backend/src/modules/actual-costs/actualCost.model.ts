import mongoose, { Schema, Document } from 'mongoose';
import type { IActualCost } from '../../../../shared/types/actualCost.interface';

export type ActualCostDocument = IActualCost & Document;

const actualCostSchema = new Schema<ActualCostDocument>(
  {
    orderId: { type: String, required: true },
    type: { type: String, required: true, enum: ["material","labor","overhead"] },
    amount: { type: Number, required: true },
    description: { type: String },
    sourceRef: { type: Object },
    date: { type: Date, default: Date.now },
    createdBy: { type: String },
  },
  { timestamps: true }
);

export const ActualCostModel = mongoose.model<ActualCostDocument>('ActualCost', actualCostSchema);
