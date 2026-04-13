import mongoose, { Document, Schema } from 'mongoose';

export interface IPaiement extends Document {
  tenantId: mongoose.Types.ObjectId;
  honoraire: mongoose.Types.ObjectId;
  dossier: mongoose.Types.ObjectId;
  montant: number;
  date: Date;
  mode: 'cash' | 'virement' | 'ccp';
  reference?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paiementSchema = new Schema<IPaiement>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    honoraire: { type: Schema.Types.ObjectId, ref: 'Honoraire', required: true },
    dossier: { type: Schema.Types.ObjectId, ref: 'Dossier', required: true },
    montant: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true, default: Date.now },
    mode: { type: String, enum: ['cash', 'virement', 'ccp'], required: true },
    reference: { type: String, trim: true },
    note: { type: String },
  },
  { timestamps: true }
);

// Index simples existants
paiementSchema.index({ honoraire: 1 });
paiementSchema.index({ dossier: 1 });
// Index tenant
paiementSchema.index({ tenantId: 1 });
// Index composés (pas de unique — un dossier a PLUSIEURS paiements)
paiementSchema.index({ tenantId: 1, honoraire: 1 });
paiementSchema.index({ tenantId: 1, dossier: 1 });

export const Paiement = mongoose.model<IPaiement>('Paiement', paiementSchema);
