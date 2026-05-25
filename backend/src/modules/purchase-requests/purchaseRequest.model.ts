import mongoose, { Schema, Document } from 'mongoose';
import type { IPurchaseRequest } from '../../../../shared/types/purchaseRequest.interface';

export type PurchaseRequestDocument = IPurchaseRequest & Document;

const purchaseRequestSchema = new Schema<PurchaseRequestDocument>(
  {
    number: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    createdBy: { type: String },
    statusId: { type: String, required: true, default: "draft" },
    orderId: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PurchaseRequestModel = mongoose.model<PurchaseRequestDocument>('PurchaseRequest', purchaseRequestSchema);
