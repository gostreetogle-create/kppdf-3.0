import mongoose, { Schema, Document } from 'mongoose';
import type { IWarehouse } from '../../../../shared/types/warehouse.interface';

export type WarehouseDocument = IWarehouse & Document;

const warehouseSchema = new Schema<WarehouseDocument>(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String },
    type: { type: String, enum: ["raw_materials","production","finished_goods"], default: "raw_materials" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const WarehouseModel = mongoose.model<WarehouseDocument>('Warehouse', warehouseSchema);
