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
    description: { type: String },
  },
  { timestamps: true },
);

export const ProductModel = mongoose.model<ProductDocument>('Product', productSchema);
