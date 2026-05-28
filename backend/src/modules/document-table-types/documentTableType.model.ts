import mongoose, { Schema, Document } from 'mongoose';
import type { IDocumentTableType } from '../../../../shared/types/documentTableType.interface';

export type DocumentTableTypeDocument = IDocumentTableType & Document;

const docTableColumnSchema = new Schema(
  {
    field: { type: String, required: true },
    header: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'number', 'select', 'date', 'image', 'currency'],
      default: 'text',
    },
    width: { type: String },
    source: { type: String },
    options: { type: String },
  },
  { _id: false },
);

const documentTableTypeSchema = new Schema<DocumentTableTypeDocument>(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    title: { type: String, required: true },
    docType: { type: String, required: true, default: 'quotation' },
    columns: { type: [docTableColumnSchema], default: [] },
    dataSource: { type: String },
    sortOrder: { type: Number, default: 0 },
    fontSize: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

documentTableTypeSchema.index({ docType: 1, isActive: 1 });
documentTableTypeSchema.index({ sortOrder: 1 });

export const DocumentTableTypeModel = mongoose.model<DocumentTableTypeDocument>(
  'DocumentTableType',
  documentTableTypeSchema,
);
