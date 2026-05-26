import mongoose, { Schema, Document } from 'mongoose';
import type { ITender } from '../../../../shared/types/tender.interface';

export type TenderDocument = ITender & Document;

const tenderSchema = new Schema<TenderDocument>(
  {
    number: { type: String, required: true, unique: true },
    tenderId: { type: String, required: true },
    date: { type: Date, default: Date.now },
    companyId: { type: String, required: true },
    email: { type: String },
    subject: { type: String },
    productName: { type: String },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: 'шт' },
    attachments: { type: String },
    deliveryTerms: { type: String },
    responseRequirements: { type: String },
    legalBasis: { type: String },
    statusId: { type: String, required: true, default: 'new' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TenderModel = mongoose.model<TenderDocument>('Tender', tenderSchema);
