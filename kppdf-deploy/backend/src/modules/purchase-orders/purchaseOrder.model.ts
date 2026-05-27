import mongoose, { Schema, Document } from 'mongoose';
import type { IPurchaseOrder } from '../../../../shared/types/purchaseOrder.interface';

export type PurchaseOrderDocument = IPurchaseOrder & Document;

const purchaseOrderSchema = new Schema<PurchaseOrderDocument>(
  {
    number: { type: String, required: true, unique: true },
    supplierId: { type: String, required: true },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date },
    statusId: { type: String, required: true, default: "new" },
    total: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PurchaseOrderModel = mongoose.model<PurchaseOrderDocument>('PurchaseOrder', purchaseOrderSchema);
