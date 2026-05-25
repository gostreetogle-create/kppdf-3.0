import mongoose, { Schema, Document } from 'mongoose';
import type { IBom } from '../../../../shared/types/bom.interface';

export type BomDocument = IBom & Document;

const bomSchema = new Schema<BomDocument>(
  {
    productId: { type: String, required: true },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const BomModel = mongoose.model<BomDocument>('Bom', bomSchema);
