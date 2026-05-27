import mongoose, { Schema, Document } from 'mongoose';
import type { ITechProcess } from '../../../../shared/types/techProcess.interface';

export type TechProcessDocument = ITechProcess & Document;

const techProcessSchema = new Schema<TechProcessDocument>(
  {
    productId: { type: String, required: true, unique: true },
    totalDuration: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TechProcessModel = mongoose.model<TechProcessDocument>('TechProcess', techProcessSchema);
