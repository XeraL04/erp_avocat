import mongoose, { Document, Schema } from 'mongoose';

export interface IEtape extends Document {
  tenantId: mongoose.Types.ObjectId;
  dossier: mongoose.Types.ObjectId;
  nom: string;
  date: Date;
  statut: 'termine' | 'enattente';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const etapeSchema = new Schema<IEtape>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    dossier: { type: Schema.Types.ObjectId, ref: 'Dossier', required: true },
    nom: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    statut: { type: String, enum: ['termine', 'enattente'], default: 'enattente' },
    notes: { type: String },
  },
  { timestamps: true }
);

// Index simples
etapeSchema.index({ dossier: 1 });
etapeSchema.index({ tenantId: 1 });
// Index composé sans unique (un dossier a PLUSIEURS étapes)
etapeSchema.index({ tenantId: 1, dossier: 1 });

export const Etape = mongoose.model<IEtape>('Etape', etapeSchema);
