import mongoose, { Schema, Document } from 'mongoose';
import type { IStockMovement } from '../../../../shared/types/stockMovement.interface';

export type StockMovementDocument = IStockMovement & Document;

const stockMovementSchema = new Schema<StockMovementDocument>(
  {
    type: { type: String, required: true, enum: ["receipt","write_off","transfer_in","transfer_out"] },
    date: { type: Date, default: Date.now },
    productId: { type: String, required: true },
    warehouseId: { type: String, required: true },
    qty: { type: Number, required: true },
    cost: { type: Number, default: 0 },
    orderId: { type: String },
    documentRef: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

export const StockMovementModel = mongoose.model<StockMovementDocument>('StockMovement', stockMovementSchema);
