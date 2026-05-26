import mongoose, { Schema, Document } from 'mongoose';
import type { IComplianceRule } from '../../../../shared/types/compliance.interface';

export type ComplianceRuleDocument = IComplianceRule & Document;

const complianceRuleSchema = new Schema<ComplianceRuleDocument>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    sourceType: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    field: { type: String, required: true },
    fieldLabel: { type: String },
    operator: {
      type: String,
      required: true,
      enum: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'approx', 'range'],
    },
    expectedValue: { type: Schema.Types.Mixed, required: true },
    expectedValueMax: { type: Schema.Types.Mixed },
    tolerance: { type: Number },
    unit: { type: String },
    severity: {
      type: String,
      required: true,
      enum: ['warning', 'block'],
      default: 'block',
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

complianceRuleSchema.index({ sourceType: 1, field: 1 });
complianceRuleSchema.index({ isActive: 1, sortOrder: 1 });

export const ComplianceRuleModel = mongoose.model<ComplianceRuleDocument>('ComplianceRule', complianceRuleSchema);
