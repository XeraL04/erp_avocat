import mongoose, { Document, Schema } from 'mongoose';

export interface IFacture extends Document {
  tenantId: mongoose.Types.ObjectId;
  numero: string;
  client: mongoose.Types.ObjectId;
  dossier: mongoose.Types.ObjectId;
  montant: number;
  dateEmission: Date;
  statut: 'brouillon' | 'emise' | 'payee';
  createdAt: Date;
  updatedAt: Date;
}

const factureSchema = new Schema<IFacture>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    numero: { type: String, trim: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    dossier: { type: Schema.Types.ObjectId, ref: 'Dossier', required: true },
    montant: { type: Number, required: true, min: 0 },
    dateEmission: { type: Date, default: Date.now },
    statut: { type: String, enum: ['brouillon', 'emise', 'payee'], default: 'brouillon' },
  },
  { timestamps: true }
);

factureSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const annee = new Date().getFullYear();
  const count = await mongoose.model('Facture').countDocuments({
    tenantId: this.tenantId,
  });
  this.numero = `FACT-${annee}-${String(count + 1).padStart(3, '0')}`;
  next();
});

factureSchema.index({ tenantId: 1 });
factureSchema.index({ client: 1 });
factureSchema.index({ dossier: 1 });

factureSchema.index({ tenantId: 1, numero: 1 }, { unique: true });

factureSchema.index({ tenantId: 1, statut: 1 });
factureSchema.index({ tenantId: 1, client: 1 });

export const Facture = mongoose.model<IFacture>('Facture', factureSchema);
