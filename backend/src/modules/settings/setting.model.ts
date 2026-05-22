import mongoose, { Schema, Document } from 'mongoose';
import type { ISetting } from '../../../../shared/types/setting.interface';

export type SettingDocument = ISetting & Document;

const settingSchema = new Schema<SettingDocument>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    description: { type: String },
    group: { type: String, default: 'general' },
  },
  { timestamps: true },
);

export const SettingModel = mongoose.model<SettingDocument>('Setting', settingSchema);
