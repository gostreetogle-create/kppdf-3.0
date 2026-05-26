import mongoose, { Schema, Document } from 'mongoose';
import type { IProductPassport } from '../../../../shared/types/productPassport.interface';

export type ProductPassportDocument = IProductPassport & Document;

const productPassportSchema = new Schema<ProductPassportDocument>(
  {
    productId: { type: String, required: true },
    passportNumber: { type: Number, required: true },
    date: { type: Date },
    warrantyCode: { type: String, required: true },
    productCode: { type: Number, required: true },
    photo: { type: String },
    category: { type: String },
    name: { type: String, required: true },
    article: { type: String },
    height: { type: Number },
    length: { type: Number },
    width: { type: Number },
    weight: { type: Number },
    description: { type: String },
    installationSite: { type: String },
    supplier: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ProductPassportModel = mongoose.model<ProductPassportDocument>('ProductPassport', productPassportSchema);
