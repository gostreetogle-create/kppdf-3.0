import mongoose, { Schema, Document } from 'mongoose';
import type { ICategory } from '../../../../shared/types/category.interface';

export type CategoryDocument = ICategory & Document;

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true },
    parentId: { type: String, default: null },
    fullPath: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const CategoryModel = mongoose.model<CategoryDocument>('Category', categorySchema);
