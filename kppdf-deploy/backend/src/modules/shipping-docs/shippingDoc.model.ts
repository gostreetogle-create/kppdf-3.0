import mongoose, { Schema, Document } from 'mongoose';
import type { IShippingDoc } from '../../../../shared/types/shippingDoc.interface';

export type ShippingDocDocument = IShippingDoc & Document;

const shippingDocSchema = new Schema<ShippingDocDocument>(
  {
    number: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    type: { type: String, required: true, enum: ["torg12","ttn","invoice"] },
    shipmentId: { type: String, required: true },
    totalAmount: { type: Number, default: 0 },
    signatures: { type: Object },
    pdfUrl: { type: String },
  },
  { timestamps: true }
);

export const ShippingDocModel = mongoose.model<ShippingDocDocument>('ShippingDoc', shippingDocSchema);
