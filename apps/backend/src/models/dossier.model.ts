import mongoose, { Document, Schema } from 'mongoose';

export interface IDossier extends Document {
  tenantId: mongoose.Types.ObjectId;
  reference: string;
  titre: string;
  client: mongoose.Types.ObjectId;
  type: 'civil' | 'penal' | 'commercial' | 'administratif' | 'autre';
  description?: string;
  statut: 'en_cours' | 'suspendu' | 'cloture';
  dateOuverture: Date;
  dateCloture?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dossierSchema = new Schema<IDossier>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    // ✅ Retiré unique: true — l'unicité est gérée par l'index composé {tenantId, reference}
    reference: { type: String, trim: true },
    titre: { type: String, required: true, trim: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    type: {
      type: String,
      enum: ['civil', 'penal', 'commercial', 'administratif', 'autre'],
      required: true,
    },
    description: { type: String },
    statut: {
      type: String,
      enum: ['en_cours', 'suspendu', 'cloture'],
      default: 'en_cours',
    },
    dateOuverture: { type: Date, default: Date.now },
    dateCloture: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dossierSchema.index({ client: 1 });
dossierSchema.index({ statut: 1 });
dossierSchema.index({ tenantId: 1 });
dossierSchema.index({ tenantId: 1, statut: 1 });
dossierSchema.index({ tenantId: 1, client: 1 });
// ✅ Seul index sur reference — unique PAR cabinet (pas global)
dossierSchema.index({ tenantId: 1, reference: 1 }, { unique: true });

export const Dossier = mongoose.model<IDossier>('Dossier', dossierSchema);
