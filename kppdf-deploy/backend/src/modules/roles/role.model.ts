import mongoose, { Schema, Document } from 'mongoose';
import type { IRole } from '../../../../shared/types/role.interface';

export type RoleDocument = IRole & Document;

const roleSchema = new Schema<RoleDocument>(
  {
    name: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    description: { type: String },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const RoleModel = mongoose.model<RoleDocument>('Role', roleSchema);
