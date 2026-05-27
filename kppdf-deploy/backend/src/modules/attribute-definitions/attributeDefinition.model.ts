import mongoose, { Schema, Document } from 'mongoose';
import type { IAttributeDefinition } from '../../../../shared/types/attributeDefinition.interface';

export type AttributeDefinitionDocument = IAttributeDefinition & Document;

const attributeDefinitionSchema = new Schema<AttributeDefinitionDocument>(
  {
    entityType: { type: String, required: true, index: true },
    categoryId: { type: String, default: null },
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'date', 'select', 'multiselect', 'text'],
      default: 'string',
    },
    unit: { type: String },
    options: [{ type: String }],
    required: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Compound unique: entityType + name + categoryId (categoryId null = global)
attributeDefinitionSchema.index({ entityType: 1, name: 1, categoryId: 1 }, { unique: true });

export const AttributeDefinitionModel = mongoose.model<AttributeDefinitionDocument>(
  'AttributeDefinition',
  attributeDefinitionSchema,
);
