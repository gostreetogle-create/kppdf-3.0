import mongoose, { Schema, Document } from 'mongoose';
import type { IEntityStatus } from '../../../../shared/types/entity-status.interface';

export type StatusDocument = IEntityStatus & Document;

const statusSchema = new Schema<StatusDocument>(
  {
    entityType: { type: String, required: true },
    statusId: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, default: '#6b7280' },
    icon: { type: String, default: 'pi pi-circle' },
    sortOrder: { type: Number, default: 0 },
    isInitial: { type: Boolean, default: false },
    isFinal: { type: Boolean, default: false },
  },
  { timestamps: true },
);

statusSchema.index({ entityType: 1, statusId: 1 }, { unique: true });

export const StatusModel = mongoose.model<StatusDocument>('EntityStatus', statusSchema);
