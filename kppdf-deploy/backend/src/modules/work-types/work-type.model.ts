import mongoose, { Schema, Document } from 'mongoose';
import type { IWorkType } from '../../../../shared/types/work-type.interface';

export type WorkTypeDocument = IWorkType & Document;

const workTypeSchema = new Schema<WorkTypeDocument>(
  {
    name: { type: String, required: true, unique: true },
    section: { type: String, enum: ['materials', 'work', 'task', 'drawing'], default: 'work' },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const WorkTypeModel = mongoose.model<WorkTypeDocument>('WorkType', workTypeSchema);
