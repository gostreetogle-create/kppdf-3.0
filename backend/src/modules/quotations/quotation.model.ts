import mongoose, { Schema, Document } from 'mongoose';
import type { IQuotation } from '../../../../shared/types/quotation.interface';

export type QuotationDocument = IQuotation & Document;

const quotationSchema = new Schema<QuotationDocument>(
  {
    number: { type: String, required: true, unique: true },
    counterpartyId: { type: String, required: true },
    date: { type: Date, default: Date.now },
    validUntil: { type: Date },
    statusId: { type: String, required: true, default: "draft" },
    total: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const QuotationModel = mongoose.model<QuotationDocument>('Quotation', quotationSchema);
