import mongoose, { Schema, Document } from 'mongoose';
import type { ICounter } from '../../../../shared/types/counter.interface';

export type CounterDocument = ICounter & Document;

const counterSchema = new Schema<CounterDocument>(
  {
    entity: { type: String, required: true },
    prefix: { type: String, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false }
);

// Compound unique: one counter per entity per year (seq resets each year)
counterSchema.index({ entity: 1, year: 1 }, { unique: true });

export const CounterModel = mongoose.model<CounterDocument>('Counter', counterSchema);
