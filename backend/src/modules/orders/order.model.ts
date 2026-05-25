import mongoose, { Schema, Document } from 'mongoose';
import type { IOrder } from '../../../../shared/types/order.interface';

export type OrderDocument = IOrder & Document;

const orderSchema = new Schema<OrderDocument>(
  {
    number: { type: String, required: true, unique: true },
    counterpartyId: { type: String, required: true },
    quotationId: { type: String },
    date: { type: Date, default: Date.now },
    plannedDate: { type: Date },
    statusId: { type: String, required: true, default: "new" },
    total: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const OrderModel = mongoose.model<OrderDocument>('Order', orderSchema);
