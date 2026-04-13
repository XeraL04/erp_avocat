import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  tenantId: mongoose.Types.ObjectId;
  type: 'physique' | 'morale';
  // Personne physique
  nom?: string;
  prenom?: string;
  cin?: string;
  // Personne morale
  raisonSociale?: string;
  representantLegal?: string;
  nifRc?: string;
  // Communs
  telephone: string;
  telephoneSecondaire?: string;
  email?: string;
  adresse?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    type: { type: String, enum: ['physique', 'morale'], required: true },
    // Personne physique
    nom: { type: String, trim: true },
    prenom: { type: String, trim: true },
    cin: { type: String, trim: true },
    // Personne morale
    raisonSociale: { type: String, trim: true },
    representantLegal: { type: String, trim: true },
    nifRc: { type: String, trim: true },
    // Communs
    telephone: { type: String, required: true, trim: true },
    telephoneSecondaire: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    adresse: { type: String, trim: true },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index pour la recherche rapide
clientSchema.index({ telephone: 1 });
clientSchema.index({ nom: 'text', prenom: 'text', raisonSociale: 'text' });

clientSchema.index({ tenantId: 1 });
clientSchema.index({ tenantId: 1, telephone: 1 });

export const Client = mongoose.model<IClient>('Client', clientSchema);
