import mongoose, { Schema, Document } from 'mongoose';
import type { IWorkOrderOperation } from '../../../../shared/types/workOrderOperation.interface';

export type WorkOrderOperationDocument = IWorkOrderOperation & Document;

const workOrderOperationSchema = new Schema<WorkOrderOperationDocument>(
  {
    workOrderId: { type: String, required: true },
    operationId: { type: String, required: true },
    order: { type: Number },
    plannedDuration: { type: Number },
    actualDuration: { type: Number },
    statusId: { type: String, default: "pending" },
    startedAt: { type: Date },
    completedAt: { type: Date },
    completedBy: { type: String },
  },
  { timestamps: true }
);

export const WorkOrderOperationModel = mongoose.model<WorkOrderOperationDocument>('WorkOrderOperation', workOrderOperationSchema);
