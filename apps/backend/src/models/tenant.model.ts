import mongoose, { Document, Schema } from 'mongoose';

export type PlanAbonnement = 'starter' | 'pro' | 'premium';
export type StatutTenant = 'actif' | 'suspendu' | 'expire' | 'essai';

export interface ITenant extends Document {
  nom: string;
  slug: string;
  email: string;
  telephone?: string;
  adresse?: string;
  plan: PlanAbonnement;
  statut: StatutTenant;
  dateDebutEssai?: Date;
  dateFinEssai?: Date;
  dateDebutAbonnement?: Date;
  dateFinAbonnement?: Date;
  limites: {
    maxDossiers: number;
    maxDocuments: number;
    maxUtilisateurs: number;
  };
  compteurs: {
    dossiers: number;
    utilisateurs: number;
  };

  numeroFiscal?: string;
  rib?: string;
  ville?: string;
  tva?: number;

  createdAt: Date;
  updatedAt: Date;
}

const PLANS = ['starter', 'pro', 'premium'] as const;
const STATUTS = ['actif', 'suspendu', 'expire', 'essai'] as const;

const tenantSchema = new Schema<ITenant>(
  {
    nom: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    telephone: { type: String, trim: true },
    adresse: { type: String },
    plan: {
      type: String,
      enum: PLANS,
      default: 'starter' as PlanAbonnement,
    },
    statut: {
      type: String,
      enum: STATUTS,
      default: 'essai' as StatutTenant,
    },
    dateDebutEssai: { type: Date, default: Date.now },
    dateFinEssai: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    dateDebutAbonnement: { type: Date },
    dateFinAbonnement: { type: Date },
    limites: {
      maxDossiers: { type: Number, default: 50 },
      maxDocuments: { type: Number, default: 500 },
      maxUtilisateurs: { type: Number, default: 2 },
    },
    compteurs: {
      dossiers: { type: Number, default: 0 },
      utilisateurs: { type: Number, default: 0 },
    },

    // nouveau 

    numeroFiscal: { type: String, trim: true },
    rib: { type: String, trim: true },
    ville: { type: String, trim: true },
    tva: { type: Number, default: 19 },
  },
  { timestamps: true }
);

tenantSchema.index({ statut: 1 });

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
