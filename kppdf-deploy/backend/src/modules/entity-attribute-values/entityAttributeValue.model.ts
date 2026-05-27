import mongoose, { Schema, Document } from 'mongoose';
import type { IEntityAttributeValue } from '../../../../shared/types/entityAttributeValue.interface';

export type EntityAttributeValueDocument = IEntityAttributeValue & Document;

const entityAttributeValueSchema = new Schema<EntityAttributeValueDocument>(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    attributeId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// Compound unique: entityType + entityId + attributeId (один атрибут — одно значение)
entityAttributeValueSchema.index(
  { entityType: 1, entityId: 1, attributeId: 1 },
  { unique: true },
);

// Index for quick lookup: все атрибуты одной сущности
entityAttributeValueSchema.index({ entityType: 1, entityId: 1 });

export const EntityAttributeValueModel = mongoose.model<EntityAttributeValueDocument>(
  'EntityAttributeValue',
  entityAttributeValueSchema,
);
