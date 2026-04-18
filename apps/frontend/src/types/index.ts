export type Role = 'superadmin' | 'admin' | 'assistant';

export type StatutTenant = 'actif' | 'suspendu' | 'expire' | 'essai';

export type PlanTenant = 'starter' | 'pro' | 'premium';

export interface UtilisateurJWT {
  id: string;
  role: Role;
  tenantId?: string;
}

export interface UtilisateurProfil {
  _id: string;
  nom: string;
  email: string;
  role: Role;
  actif: boolean;
  tenantId?: string;
  createdAt: string;
}

export interface Tenant {
  _id: string;
  nom: string;
  slug: string;
  email: string;
  telephone: string;
  adresse?: string;
  plan: PlanTenant;
  statut: StatutTenant;
  dateDebutEssai?: string;
  dateFinEssai?: string;
  dateDebutAbonnement?: string;
  dateFinAbonnement?: string;
  compteurs: {
    dossiers: number;
    utilisateurs: number;
  };
  limites: {
    maxDossiers: number;
    maxDocuments: number;
    maxUtilisateurs: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UtilisateurCabinet {
  _id: string;
  nom: string;
  email: string;
  role: Role;
  actif: boolean;
}

export interface TenantDetail extends Tenant {
  utilisateurs: UtilisateurCabinet[];
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  statusCode: number;
}

// ─── Module Clients ───────────────────────────────────────────────────────────

export type TypeClient = 'physique' | 'morale';

export interface Client {
  _id: string;
  tenantId: string;
  type: TypeClient;
  nom?: string;
  prenom?: string;
  cin?: string;
  raisonSociale?: string;
  representantLegal?: string;
  nifRc?: string;
  telephone: string;
  telephoneSecondaire?: string;
  email?: string;
  adresse?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientNommable {
  type: 'physique' | 'morale';
  nom?: string;
  prenom?: string;
  raisonSociale?: string;
}

export interface ClientPopule extends ClientNommable {
  _id: string;
  telephone: string;
  email?: string;
  adresse?: string;
}

export function nomAffiche(client: ClientNommable): string {
  if (client.type === 'physique') {
    return [client.prenom, client.nom].filter(Boolean).join(' ') || '—';
  }
  return client.raisonSociale || '—';
}

// ─── Module Dossiers ──────────────────────────────────────────────────────────

// -- Enums --

export type QualitePartie =
  | 'demandeur'
  | 'defendeur'
  | 'demandeur_pourvoi'
  | 'defendeur_pourvoi'
  | 'demandeur_renvoi'
  | 'defendeur_renvoi';

export type TypeAffaire = 'civil' | 'penal' | 'administratif'; // ← nouveau

export type SpecialiteDossier = // ← remplace SectionDossier
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

// -- Labels lisibles --

export const LABELS_QUALITE: Record<QualitePartie, string> = {
  demandeur: 'Le Demandeur',
  defendeur: 'Le Défendeur',
  demandeur_pourvoi: "Le Demandeur au pourvoi / L'Appelant",
  defendeur_pourvoi: "Le Défendeur au pourvoi / L'Intimé",
  demandeur_renvoi: 'Demandeur au renvoi',
  defendeur_renvoi: 'Défendeur au renvoi',
};

export const LABELS_TYPE_AFFAIRE: Record<TypeAffaire, string> = {
  civil: 'Civil',
  penal: 'Pénal',
  administratif: 'Administratif',
};

export const SPECIALITES_PAR_TYPE: Record<
  TypeAffaire,
  { valeur: SpecialiteDossier; label: string }[]
> = {
  civil: [
    { valeur: 'civil', label: 'Civil' },
    { valeur: 'foncier', label: 'Foncier' },
    { valeur: 'affaires_familiales', label: 'Affaires familiales' },
    { valeur: 'sociale', label: 'Sociale' },
    { valeur: 'commerciale', label: 'Commerciale' },
    { valeur: 'refere', label: 'Référé' },
  ],
  penal: [
    { valeur: 'contraventions', label: 'Contraventions' },
    { valeur: 'delits', label: 'Délits' },
    { valeur: 'crimes', label: 'Crimes' },
  ],
  administratif: [
    { valeur: 'ordinaire', label: 'Ordinaire' },
    { valeur: 'refere_administratif', label: 'Référé administratif' },
  ],
};

export const LABELS_SPECIALITE: Record<SpecialiteDossier, string> = {
  civil: 'Civil',
  foncier: 'Foncier',
  affaires_familiales: 'Affaires familiales',
  sociale: 'Sociale',
  commerciale: 'Commerciale',
  refere: 'Référé',
  contraventions: 'Contraventions',
  delits: 'Délits',
  crimes: 'Crimes',
  ordinaire: 'Ordinaire',
  refere_administratif: 'Référé administratif',
};

export const LABELS_INSTITUTION: Record<InstitutionDossier, string> = {
  tribunal: 'Tribunal',
  cour: 'Cour',
  cour_supreme: 'Cour Suprême',
  tribunal_administratif: 'Tribunal Administratif',
  cour_appel_administrative: "Cour d'Appel Administrative",
  conseil_etat: "Conseil d'État",
};

export const GROUPES_INSTITUTION: {
  label: string;
  options: InstitutionDossier[];
}[] = [
  {
    label: 'Ordre Judiciaire',
    options: ['tribunal', 'cour', 'cour_supreme'],
  },
  {
    label: 'Ordre Administratif',
    options: ['tribunal_administratif', 'cour_appel_administrative', 'conseil_etat'],
  },
];

// -- Sous-document Report --

export interface Report {
  _id: string;
  date: string;
  raison: string;
  jugement?: string;
}

// -- Interface principale Dossier --

export interface Dossier {
  _id: string;
  id: string;
  tenantId: string;
  reference: string;

  // Parties
  clientId: ClientPopule | string;
  qualiteClient: QualitePartie;
  adversaire: string;
  qualiteAdversaire: QualitePartie;

  // Identification judiciaire
  dossierNumero?: string;
  institution?: InstitutionDossier;
  typeAffaire?: TypeAffaire;
  specialite?: SpecialiteDossier;

  // Procédure
  statut: StatutDossier;
  dateOuverture: string;
  dateCloture?: string;
  description?: string;

  // Reports d'audiences
  reports: Report[];

  // nom de l'institution personnalisée
  nomInstitution?: string;

  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// -- Helpers statut --

export const LABELS_STATUT_DOSSIER: Record<StatutDossier, string> = {
  encours: 'En cours',
  suspendu: 'Suspendu',
  cloture: 'Clôturé',
};

export const COULEURS_STATUT_DOSSIER: Record<StatutDossier, 'default' | 'secondary' | 'outline'> = {
  encours: 'default',
  suspendu: 'secondary',
  cloture: 'outline',
};

// ─── Module Honoraires ────────────────────────────────────────────────────────

export type TypeHonoraire = 'forfait' | 'echelonne';

export type StatutPaiementHonoraire = 'nonpaye' | 'partiel' | 'paye';

export interface Honoraire {
  _id: string;
  tenantId: string;
  dossier: string;
  montantTotal: number;
  type: TypeHonoraire;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Module Factures ──────────────────────────────────────────────────────────

export type StatutFacture = 'brouillon' | 'emise' | 'payee';

export interface DossierPopuleFacture {
  _id?: string;
  id: string;
  reference: string;
  titre: string;
  type: StatutDossier;
  statut: StatutDossier;
}

export interface Facture {
  id: string;
  tenantId: string;
  numero: string;
  statut: StatutFacture;
  montant: number;
  dateEmission: string;
  client: ClientPopule | string;
  dossier: DossierPopuleFacture | string;
  createdAt: string;
  updatedAt: string;
}
