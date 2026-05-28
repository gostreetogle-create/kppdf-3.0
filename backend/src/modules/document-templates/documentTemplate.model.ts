import mongoose, { Schema, Document } from 'mongoose';
import type { IDocumentTemplate } from '../../../../shared/types/documentTemplate.interface';

export type DocumentTemplateDocument = IDocumentTemplate & Document;

const documentBlockCellSchema = new Schema(
  {
    content: { type: String, default: '' },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
  },
  { _id: false },
);

const documentBlockSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['text', 'table', 'header', 'separator', 'image'],
      required: true,
    },
    order: { type: Number, required: true },
    title: { type: String },
    content: { type: String, default: '' },
    tableKind: { type: String },
    cells: { type: [documentBlockCellSchema], default: undefined },
    settings: {
      fontSize: { type: Number, default: 11 },
      fontWeight: { type: String, enum: ['normal', 'bold', 'semibold'], default: 'normal' },
      align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
      color: { type: String },
      paddingTop: { type: Number, default: 4 },
      paddingBottom: { type: Number, default: 4 },
      columns: { type: Number },
    },
  },
  { _id: true },
);

const documentTemplateSchema = new Schema<DocumentTemplateDocument>(
  {
    name: { type: String, required: true },
    organizationId: { type: String },
    docType: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    pageSize: { type: String, enum: ['A4'], default: 'A4' },
    backgroundImage: { type: String },
    blocks: { type: [documentBlockSchema], default: [] },
  },
  { timestamps: true },
);

documentTemplateSchema.index({ organizationId: 1, docType: 1 });
documentTemplateSchema.index({ docType: 1, isDefault: 1 });

export const DocumentTemplateModel = mongoose.model<DocumentTemplateDocument>(
  'DocumentTemplate',
  documentTemplateSchema,
);
