import mongoose, { Schema, Document } from 'mongoose';
import type { IReservation } from '../../../../shared/types/reservation.interface';

export type ReservationDocument = IReservation & Document;

const reservationSchema = new Schema<ReservationDocument>(
  {
    orderId: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ReservationModel = mongoose.model<ReservationDocument>('Reservation', reservationSchema);
