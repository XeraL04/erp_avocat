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
  createdAt: string;
  updatedAt: string;
}

// Interface minimale partagée — accepte Client ET ClientPopule dans nomAffiche()
export interface ClientNommable {
  type: 'physique' | 'morale';
  nom?: string;
  prenom?: string;
  raisonSociale?: string;
}

// Sous-ensemble renvoyé par le populate Mongoose dans les réponses dossier
export interface ClientPopule extends ClientNommable {
  _id: string;
  telephone: string;
  email?: string;
  adresse?: string;
}

// Retourne le nom affiché selon le type — accepte Client, ClientPopule ou tout ClientNommable
export function nomAffiche(client: ClientNommable): string {
  if (client.type === 'physique') {
    return [client.prenom, client.nom].filter(Boolean).join(' ') || '—';
  }
  return client.raisonSociale || '—';
}

// ─── Module Dossiers ──────────────────────────────────────────────────────────

export type TypeDossier =
  | 'civil'
  | 'penal'
  | 'commercial'
  | 'administratif'
  | 'autre';

export type StatutDossier = 'en_cours' | 'suspendu' | 'cloture';

export interface Dossier {
  _id: string;
  tenantId: string;
  reference: string;
  titre: string;
  client: ClientPopule | string;
  type: TypeDossier;
  statut: StatutDossier;
  description?: string;
  dateOuverture: string;
  dateCloture?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Module Honoraires ────────────────────────────────────────────────────────

export type TypeHonoraire = 'forfait' | 'echelonne';

export type StatutPaiementHonoraire = 'nonpaye' | 'partiel' | 'paye';

export interface Honoraire {
  _id: string;
  tenantId: string;
  dossier: string;
  montantTotal: number;
  type: TypeHonoraire;
  description?: string;   // ← seul champ optionnel, conforme au modèle backend
  createdAt: string;
  updatedAt: string;
}

// ─── Module Factures ────────────────────────────────────────────────────────
export type StatutFacture = 'brouillon' | 'emise' | 'payee';

export interface DossierPopuleFacture {
  _id?: string;
  id: string;
  reference: string;
  titre: string;
  type: TypeDossier;
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