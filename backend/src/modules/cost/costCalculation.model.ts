import mongoose, { Schema, Document } from 'mongoose';
import type { ICostCalculation } from '../../../../shared/types/costCalculation.interface';

export type CostCalculationDocument = ICostCalculation & Document;

const costCalculationSchema = new Schema<CostCalculationDocument>(
  {
    productId: { type: String, required: true },
    bomVersion: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CostCalculationModel = mongoose.model<CostCalculationDocument>('CostCalculation', costCalculationSchema);
