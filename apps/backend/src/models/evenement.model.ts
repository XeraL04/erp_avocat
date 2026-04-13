import mongoose, { Document, Schema } from 'mongoose';
import { Tenant } from './tenant.model';
import { Dossier } from './dossier.model';

export interface IEvenement extends Document {
  tenantId: mongoose.Types.ObjectId;
  titre: string;
  type: 'audience' | 'rdv' | 'rappel';
  dateHeure: Date;
  lieu?: string;
  dossier?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const evenementSchema = new Schema<IEvenement>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    titre: { type: String, required: true, trim: true },
    type: { type: String, enum: ['audience', 'rdv', 'rappel'], required: true },
    dateHeure: { type: Date, required: true },
    lieu: { type: String, trim: true },
    dossier: { type: Schema.Types.ObjectId, ref: 'Dossier' },
    notes: { type: String },
  },
  { timestamps: true }
);

evenementSchema.index({ dateHeure: 1 });
evenementSchema.index({ dossier: 1 });

evenementSchema.index({ tenantId: 1 });

evenementSchema.index({ tenantId: 1, dateHeure: 1 });
evenementSchema.index({ tenantId: 1, dossier: 1 });

export const Evenement = mongoose.model<IEvenement>('Evenement', evenementSchema);
