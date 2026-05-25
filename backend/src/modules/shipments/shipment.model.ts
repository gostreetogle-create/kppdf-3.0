import mongoose, { Schema, Document } from 'mongoose';
import type { IShipment } from '../../../../shared/types/shipment.interface';

export type ShipmentDocument = IShipment & Document;

const shipmentSchema = new Schema<ShipmentDocument>(
  {
    number: { type: String, required: true, unique: true },
    orderId: { type: String, required: true },
    date: { type: Date, default: Date.now },
    recipient: { type: String },
    address: { type: String },
    statusId: { type: String, default: "shipped" },
    driverInfo: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ShipmentModel = mongoose.model<ShipmentDocument>('Shipment', shipmentSchema);
