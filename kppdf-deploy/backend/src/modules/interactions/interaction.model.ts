import mongoose, { Schema, Document } from 'mongoose';
import type { IInteraction } from '../../../../shared/types/interaction.interface';

export type InteractionDocument = IInteraction & Document;

const interactionSchema = new Schema<InteractionDocument>(
  {
    counterpartyId: { type: String, required: true },
    type: { type: String, required: true, enum: ["call","email","meeting","note","system"] },
    description: { type: String },
    relatedTo: { type: Object },
    createdBy: { type: String },
  },
  { timestamps: true }
);

export const InteractionModel = mongoose.model<InteractionDocument>('Interaction', interactionSchema);
