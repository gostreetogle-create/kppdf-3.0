import mongoose, { Schema, Document } from 'mongoose';
import type { ICounterparty } from '../../../../shared/types/counterparty.interface';

export type CounterpartyDocument = ICounterparty & Document;

const counterpartySchema = new Schema<CounterpartyDocument>(
  {
    name: { type: String, required: true, index: 'text' },
    shortName: { type: String },
    legalForm: { type: String, enum: ['ООО', 'ИП', 'АО', 'ПАО', 'Физлицо', 'Другое'], default: 'ООО' },
    roles: [{ type: String, enum: ['client', 'supplier', 'company'] }],
    inn: { type: String },
    kpp: { type: String },
    ogrn: { type: String },
    legalAddress: { type: String },
    phone: { type: String },
    email: { type: String },
    bankName: { type: String },
    bik: { type: String },
    checkingAccount: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

counterpartySchema.index({ inn: 1 }, { unique: true, sparse: true, background: true });

export const CounterpartyModel = mongoose.model<CounterpartyDocument>('Counterparty', counterpartySchema);
