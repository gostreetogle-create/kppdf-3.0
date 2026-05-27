import mongoose, { Schema, Document } from 'mongoose';
import type { IWorkOrder } from '../../../../shared/types/workOrder.interface';

export type WorkOrderDocument = IWorkOrder & Document;

const workOrderSchema = new Schema<WorkOrderDocument>(
  {
    number: { type: String, required: true, unique: true },
    orderId: { type: String, required: true },
    productId: { type: String, required: true },
    qty: { type: Number, required: true },
    statusId: { type: String, default: "new" },
    startDate: { type: Date },
    endDate: { type: Date },
    assignedTo: { type: String },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const WorkOrderModel = mongoose.model<WorkOrderDocument>('WorkOrder', workOrderSchema);
