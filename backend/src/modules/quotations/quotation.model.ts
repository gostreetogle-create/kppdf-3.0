import mongoose, { Schema, Document } from 'mongoose';
import type { IQuotation } from '../../../../shared/types/quotation.interface';

export type QuotationDocument = IQuotation & Document;

const quotationItemSchema = new Schema(
  {
    productId: { type: String },
    sku: { type: String, default: '' },
    photo: { type: String },
    name: { type: String, required: true },
    qty: { type: Number, required: true, default: 1 },
    unit: { type: String, default: 'шт' },
    price: { type: Number, required: true, default: 0 },
    sum: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

const quotationSchema = new Schema<QuotationDocument>(
  {
    number: { type: String, required: true, unique: true },
    counterpartyId: { type: String, required: true },
    tenderId: { type: String },
    date: { type: Date, default: Date.now },
    validUntil: { type: Date },
    statusId: { type: String, required: true, default: 'draft' },
    total: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    templateId: { type: String },
    items: { type: [quotationItemSchema], default: [] },
  },
  { timestamps: true },
);

export const QuotationModel = mongoose.model<QuotationDocument>('Quotation', quotationSchema);
