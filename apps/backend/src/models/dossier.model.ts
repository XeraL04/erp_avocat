import mongoose, { Document, Schema } from 'mongoose';


// ─── Enums ────────────────────────────────────────────────────────────────────

export type QualitePartie =
  | 'demandeur'
  | 'defendeur'
  | 'demandeur_pourvoi'
  | 'defendeur_pourvoi'
  | 'demandeur_renvoi'
  | 'defendeur_renvoi';

export type TypeAffaire = 'civil' | 'penal' | 'administratif';

export type SpecialiteDossier =
  // civil
  | 'civil'
  | 'foncier'
  | 'affaires_familiales'
  | 'sociale'
  | 'commerciale'
  | 'refere'
  // pénal
  | 'contraventions'
  | 'delits'
  | 'crimes'
  // administratif
  | 'ordinaire'
  | 'refere_administratif';

export type InstitutionDossier =
  | 'tribunal'
  | 'cour'
  | 'cour_supreme'
  | 'tribunal_administratif'
  | 'cour_appel_administrative'
  | 'conseil_etat';

export type StatutDossier = 'encours' | 'suspendu' | 'cloture';


// ─── Sous-document : Report ───────────────────────────────────────────────────

export interface IReport {
  _id?: string;
  date:      Date;
  raison:    string;
  jugement?: string;
}

const reportSchema = new Schema<IReport>(
  {
    date:     { type: Date,   required: true },
    raison:   { type: String, required: true, trim: true },
    jugement: { type: String, trim: true },
  },
  { _id: true }
);


// ─── Document principal ───────────────────────────────────────────────────────

export interface IDossier extends Document {
  tenantId:          mongoose.Types.ObjectId;
  reference:         string;

  // Parties
  clientId:          mongoose.Types.ObjectId;
  qualiteClient:     QualitePartie;
  adversaire:        string;
  qualiteAdversaire: QualitePartie;

  // Identification judiciaire
  dossierNumero?:  string;
  institution?:    InstitutionDossier;
  nomInstitution?: string;           // ← NOUVEAU
  typeAffaire?:    TypeAffaire;
  specialite?:     SpecialiteDossier;

  // Procédure
  statut:        StatutDossier;
  dateOuverture: Date;
  dateCloture?:  Date;
  description?:  string;

  // Reports d'audiences
  reports: IReport[];

  isDeleted:  boolean;
  createdAt:  Date;
  updatedAt:  Date;
}

const dossierSchema = new Schema<IDossier>(
  {
    tenantId: {
      type:     mongoose.Schema.Types.ObjectId,
      required: true,
      ref:      'Tenant',
    },
    reference: {
      type:     String,
      required: true,
      trim:     true,
    },

    // ── Parties ───────────────────────────────────────────────────────────────
    clientId: {
      type:     mongoose.Schema.Types.ObjectId,
      required: true,
      ref:      'Client',
    },
    qualiteClient: {
      type:     String,
      required: true,
      enum:     ['demandeur','defendeur','demandeur_pourvoi','defendeur_pourvoi','demandeur_renvoi','defendeur_renvoi'],
    },
    adversaire: {
      type:     String,
      required: true,
      trim:     true,
    },
    qualiteAdversaire: {
      type:     String,
      required: true,
      enum:     ['demandeur','defendeur','demandeur_pourvoi','defendeur_pourvoi','demandeur_renvoi','defendeur_renvoi'],
    },

    // ── Identification judiciaire ──────────────────────────────────────────────
    dossierNumero: {
      type: String,
      trim: true,
    },
    institution: {
      type: String,
      enum: ['tribunal','cour','cour_supreme','tribunal_administratif','cour_appel_administrative','conseil_etat'],
    },
    nomInstitution: {                // ← NOUVEAU
      type: String,
      trim: true,
    },
    typeAffaire: {
      type: String,
      enum: ['civil', 'penal', 'administratif'],
    },
    specialite: {
      type: String,
      enum: [
        // civil
        'civil', 'foncier', 'affaires_familiales', 'sociale', 'commerciale', 'refere',
        // pénal
        'contraventions', 'delits', 'crimes',
        // administratif
        'ordinaire', 'refere_administratif',
      ],
    },

    // ── Procédure ─────────────────────────────────────────────────────────────
    statut: {
      type:    String,
      enum:    ['encours', 'suspendu', 'cloture'],
      default: 'encours',
    },
    dateOuverture: {
      type:    Date,
      default: () => new Date(),
    },
    dateCloture: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },

    // ── Reports ───────────────────────────────────────────────────────────────
    reports: {
      type:    [reportSchema],
      default: [],
    },

    isDeleted: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


// ─── Index ────────────────────────────────────────────────────────────────────
dossierSchema.index({ tenantId: 1, reference: 1 }, { unique: true });
dossierSchema.index({ tenantId: 1, statut: 1 });
dossierSchema.index({ tenantId: 1, clientId: 1 });
dossierSchema.index({ tenantId: 1, institution: 1 });
dossierSchema.index({ tenantId: 1, typeAffaire: 1 });
dossierSchema.index({ tenantId: 1, specialite: 1 });
dossierSchema.index({ tenantId: 1, nomInstitution: 1 }); // ← NOUVEAU


const Dossier = mongoose.model<IDossier>('Dossier', dossierSchema);
export default Dossier;