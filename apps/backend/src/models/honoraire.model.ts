import mongoose, { Document, Schema } from 'mongoose';

export interface IHonoraire extends Document {
  tenantId: mongoose.Types.ObjectId;
  dossier: mongoose.Types.ObjectId;
  montantTotal: number;
  type: 'forfait' | 'echelonne';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const honoraireSchema = new Schema<IHonoraire>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    dossier: { type: Schema.Types.ObjectId, ref: 'Dossier', required: true },
    montantTotal: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['forfait', 'echelonne'], required: true },
    description: { type: String },
  },
  { timestamps: true }
);

// Un seul honoraire PAR dossier PAR cabinet
honoraireSchema.index({ tenantId: 1 });
honoraireSchema.index({ tenantId: 1, dossier: 1 }, { unique: true });

export const Honoraire = mongoose.model<IHonoraire>('Honoraire', honoraireSchema);
