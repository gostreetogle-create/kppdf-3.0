import mongoose, { Schema, Document } from 'mongoose';
import type { IProduct } from '../../../../shared/types/product.interface';

export type ProductDocument = IProduct & Document;

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, index: 'text' },
    sku: { type: String, unique: true, sparse: true },
    kind: { type: String, enum: ['ITEM', 'SERVICE', 'WORK'], default: 'ITEM' },
    unit: { type: String, default: 'шт' },
    categoryId: { type: String },
    status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
    listPrice: { type: Number, default: 0 },
    stockQty: { type: Number, default: 0 },
    description: { type: String },
    // Технические характеристики (из паспортов изделий)
    height: { type: Number },
    length: { type: Number },
    width: { type: Number },
    weight: { type: Number },
    materials: { type: String },
    installation: { type: String },
    purpose: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ProductModel = mongoose.model<ProductDocument>('Product', productSchema);
