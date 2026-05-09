// apps/frontend/src/api/paiement.api.ts
import apiClient from './client';
import type { ApiSuccess } from '@/types';

// ─── Types de base ─────────────────────────────────────────────────────────────

export type ModePaiement = 'cash' | 'virement' | 'ccp';

/** Paiement tel que retourné par GET /dossiers/:id/paiements (IDs non peuplés) */
export interface Paiement {
  _id: string;
  id: string;
  tenantId: string;
  dossier: string;
  honoraire: string;
  montant: number;
  date: string;
  mode: ModePaiement;
  reference?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Types peuplés (GET /paiements global) ────────────────────────────────────

export interface ClientResume {
  _id: string;
  nom?: string;
  prenom?: string;
  raisonSociale?: string;
  type: 'physique' | 'morale';
}

export interface DossierResume {
  _id: string;
  reference: string;
  titre: string;
  client: ClientResume;
}

export interface HonoraireResume {
  _id: string;
  montantTotal: number;
  type: 'forfait' | 'echelonne';
}

/** Paiement retourné par GET /cabinet/paiements — dossier & honoraire peuplés */
export interface PaiementPopule {
  _id: string;
  id: string;
  tenantId: string;
  dossier: DossierResume;
  honoraire: HonoraireResume;
  montant: number;
  date: string;
  mode: ModePaiement;
  reference?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Types facture minimale pour génération depuis paiement ───────────────────

export interface FactureClientResume {
  _id: string;
  nom?: string;
  prenom?: string;
  raisonSociale?: string;
  telephone: string;
  type: 'physique' | 'morale';
}

export interface FactureDossierResume {
  _id: string;
  reference: string;
  titre: string;
  type: string;
}

export interface FactureDepuisPaiement {
  _id: string;
  id?: string;
  tenantId: string;
  numero: string;
  client: FactureClientResume;
  dossier: FactureDossierResume;
  montant: number;
  dateEmission: string;
  statut: 'brouillon' | 'emise' | 'payee';
  paiementSource?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Autres types ──────────────────────────────────────────────────────────────

export interface MetaPaiements {
  total: number;
  montantTotal: number;
  totalPaye: number;
  resteAPayer: number;
  statut: 'nonpaye' | 'partiel' | 'paye';
  nombrePaiements: number;
  devise: string;
}

export interface ReponsePaiements {
  paiements: Paiement[];
  meta: MetaPaiements | null;
}

export interface StatsPaiements {
  totalEncaisse: number;
  cash: number;
  virement: number;
  ccp: number;
}

export interface ReponsePagineeePaiements {
  paiements: PaiementPopule[];
  stats: StatsPaiements;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Payload backend — noms exacts attendus par le schéma Zod */
export interface PayloadPaiement {
  honoraireId: string;
  dossierId: string;
  montant: number;
  date: string;
  mode: ModePaiement;
  reference?: string;
  note?: string;
}

// ─── Helper ────────────────────────────────────────────────────────────────────

export function nomClient(client: ClientResume): string {
  return client.type === 'morale'
    ? (client.raisonSociale ?? 'Client')
    : `${client.nom ?? ''} ${client.prenom ?? ''}`.trim() || 'Client';
}

// ─── Normalisation _id → id ───────────────────────────────────────────────────

function norm<T extends { _id: string; id?: string }>(p: T): T {
  return { ...p, id: p._id ?? p.id };
}

// ─── API dossier-level (utilisée par TabHonoraires) ───────────────────────────

/** GET /cabinet/dossiers/:id/paiements */
export async function listerPaiements(dossierId: string): Promise<ReponsePaiements> {
  const { data } = await apiClient.get<
    ApiSuccess<{ paiements: Paiement[]; resumeFinancier: MetaPaiements | null }>
  >(`/cabinet/dossiers/${dossierId}/paiements`);

  return {
    paiements: Array.isArray(data.data.paiements) ? data.data.paiements.map(norm) : [],
    meta: data.data.resumeFinancier ?? null,
  };
}

/** POST /cabinet/paiements — utilisé par TabHonoraires */
export async function ajouterPaiement(payload: PayloadPaiement): Promise<Paiement> {
  const { data } = await apiClient.post<
    ApiSuccess<{ paiement: Paiement; resumeFinancier: MetaPaiements }>
  >('/cabinet/paiements', payload);

  return norm(data.data.paiement);
}

/** PUT /cabinet/paiements/:id */
export async function modifierPaiement(
  paiementId: string,
  payload: Partial<Pick<PayloadPaiement, 'montant' | 'date' | 'mode' | 'reference' | 'note'>>
): Promise<Paiement> {
  const { data } = await apiClient.put<
    ApiSuccess<{ paiement: Paiement; resumeFinancier: MetaPaiements }>
  >(`/cabinet/paiements/${paiementId}`, payload);

  return norm(data.data.paiement);
}

/** DELETE /cabinet/paiements/:id */
export async function supprimerPaiement(paiementId: string): Promise<void> {
  await apiClient.delete(`/cabinet/paiements/${paiementId}`);
}

/** POST /cabinet/paiements/:paiementId/facture */
export async function creerFactureDepuisPaiement(
  paiementId: string
): Promise<FactureDepuisPaiement> {
  const { data } = await apiClient.post<ApiSuccess<{ facture: FactureDepuisPaiement }>>(
    `/cabinet/paiements/${paiementId}/facture`
  );

  return norm(data.data.facture);
}

// ─── API globale (PaiementsPage) ──────────────────────────────────────────────

/** GET /cabinet/paiements — liste paginée + stats KPI */
export async function listerTousPaiements(params?: {
  mode?: ModePaiement;
  dossierId?: string;
  page?: number;
  limit?: number;
}): Promise<ReponsePagineeePaiements> {
  const { data } = await apiClient.get<
    ApiSuccess<{ paiements: PaiementPopule[]; stats: StatsPaiements }>
  >('/cabinet/paiements', { params });

  const fallbackMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

  const meta = data.meta
    ? {
        page: data.meta.page ?? 1,
        limit: data.meta.limit ?? 20,
        total: data.meta.total ?? 0,
        totalPages:
          data.meta.totalPages ?? Math.ceil((data.meta.total ?? 0) / (data.meta.limit ?? 20)),
      }
    : fallbackMeta;

  return {
    paiements: Array.isArray(data.data.paiements) ? data.data.paiements.map(norm) : [],
    stats: data.data.stats,
    meta,
  };
}

/** POST /cabinet/paiements — utilisé par PaiementsPage */
export async function creerPaiement(payload: {
  dossierId: string;
  honoraireId: string;
  montant: number;
  mode: ModePaiement;
  date: string;
  reference?: string;
  note?: string;
}): Promise<PaiementPopule> {
  const { data } = await apiClient.post<
    ApiSuccess<{ paiement: PaiementPopule; resumeFinancier: MetaPaiements }>
  >('/cabinet/paiements', payload);

  return norm(data.data.paiement);
}

// // apps/frontend/src/api/paiement.api.ts
// import apiClient from './client';
// import type { ApiSuccess } from '@/types';

// // ─── Types de base ─────────────────────────────────────────────────────────────

// export type ModePaiement = 'cash' | 'virement' | 'ccp';

// /** Paiement tel que retourné par GET /dossiers/:id/paiements (IDs non peuplés) */
// export interface Paiement {
//   _id: string;
//   id: string;
//   tenantId: string;
//   dossier: string;
//   honoraire: string;
//   montant: number;
//   date: string;
//   mode: ModePaiement;
//   reference?: string;
//   note?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// // ─── Types peuplés (GET /paiements global) ─────────────────────────────────────

// export interface ClientResume {
//   _id: string;
//   nom?: string;
//   prenom?: string;
//   raisonSociale?: string;
//   type: 'physique' | 'morale';
// }

// export interface DossierResume {
//   _id: string;
//   reference: string;
//   titre: string;
//   client: ClientResume;
// }

// export interface HonoraireResume {
//   _id: string;
//   montantTotal: number;
//   type: 'forfait' | 'echelonne';
// }

// /** Paiement retourné par GET /cabinet/paiements — dossier & honoraire peuplés */
// export interface PaiementPopule {
//   _id: string;
//   id: string;
//   tenantId: string;
//   dossier: DossierResume;
//   honoraire: HonoraireResume;
//   montant: number;
//   date: string;
//   mode: ModePaiement;
//   reference?: string;
//   note?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// // ─── Autres types ──────────────────────────────────────────────────────────────

// export interface MetaPaiements {
//   total: number;
//   montantTotal: number;
//   totalPaye: number;
//   resteAPayer: number;
//   statut: 'nonpaye' | 'partiel' | 'paye';
//   nombrePaiements: number;
//   devise: string;
// }

// export interface ReponsePaiements {
//   paiements: Paiement[];
//   meta: MetaPaiements | null;
// }

// export interface StatsPaiements {
//   totalEncaisse: number;
//   cash: number;
//   virement: number;
//   ccp: number;
// }

// export interface ReponsePagineeePaiements {
//   paiements: PaiementPopule[];
//   stats: StatsPaiements;
//   meta: { page: number; limit: number; total: number; totalPages: number };
// }

// /** Payload backend — noms exacts attendus par le schéma Zod */
// export interface PayloadPaiement {
//   honoraireId: string;
//   dossierId: string;
//   montant: number;
//   date: string;
//   mode: ModePaiement;
//   reference?: string;
//   note?: string;
// }

// // ─── Helper ────────────────────────────────────────────────────────────────────

// export function nomClient(client: ClientResume): string {
//   return client.type === 'morale'
//     ? (client.raisonSociale ?? 'Client')
//     : `${client.nom ?? ''} ${client.prenom ?? ''}`.trim() || 'Client';
// }

// // ─── Normalisation _id → id ────────────────────────────────────────────────────

// function norm<T extends { _id: string; id?: string }>(p: T): T {
//   return { ...p, id: p._id ?? p.id };
// }

// // ─── API dossier-level (utilisée par TabHonoraires) ───────────────────────────

// /** GET /cabinet/dossiers/:id/paiements */
// export async function listerPaiements(dossierId: string): Promise<ReponsePaiements> {
//   const { data } = await apiClient.get<
//     ApiSuccess<{ paiements: Paiement[]; resumeFinancier: MetaPaiements | null }>
//   >(`/cabinet/dossiers/${dossierId}/paiements`);
//   return {
//     paiements: data.data.paiements ?? [],
//     meta: data.data.resumeFinancier ?? null,
//   };
// }

// /** POST /cabinet/paiements — utilisé par TabHonoraires (honoraire + dossier) */
// export async function ajouterPaiement(payload: PayloadPaiement): Promise<Paiement> {
//   const { data } = await apiClient.post<
//     ApiSuccess<{ paiement: Paiement; resumeFinancier: MetaPaiements }>
//   >('/cabinet/paiements', payload);
//   // Le backend retourne { paiement, resumeFinancier }
//   return norm(data.data.paiement);
// }

// /** PUT /cabinet/paiements/:id */
// export async function modifierPaiement(
//   paiementId: string,
//   payload: Partial<Pick<PayloadPaiement, 'montant' | 'date' | 'mode' | 'reference' | 'note'>>
// ): Promise<Paiement> {
//   const { data } = await apiClient.put<
//     ApiSuccess<{ paiement: Paiement; resumeFinancier: MetaPaiements }>
//   >(`/cabinet/paiements/${paiementId}`, payload);
//   return norm(data.data.paiement);
// }

// /** DELETE /cabinet/paiements/:id */
// export async function supprimerPaiement(paiementId: string): Promise<void> {
//   await apiClient.delete(`/cabinet/paiements/${paiementId}`);
// }

// // ─── API globale (PaiementsPage) ──────────────────────────────────────────────

// /** GET /cabinet/paiements — liste paginée + stats KPI */
// export async function listerTousPaiements(params?: {
//   mode?: ModePaiement;
//   dossierId?: string;
//   page?: number;
//   limit?: number;
// }): Promise<ReponsePagineeePaiements> {
//   const res = await apiClient.get<
//     ApiSuccess<{ paiements: PaiementPopule[]; stats: StatsPaiements }> & {
//       meta: ReponsePagineeePaiements['meta'];
//     }
//   >('/cabinet/paiements', { params });

//   return {
//     paiements: res.data.data.paiements.map(norm),
//     stats: res.data.data.stats,
//     meta: res.data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
//   };
// }

// /** POST /cabinet/paiements — utilisé par PaiementsPage (renomme honoraireId/dossierId → honoraire/dossier) */
// export async function creerPaiement(payload: {
//   dossierId: string;
//   honoraireId: string;
//   montant: number;
//   mode: ModePaiement;
//   date: string;
//   reference?: string;
//   note?: string;
// }): Promise<PaiementPopule> {
//   const { data } = await apiClient.post<
//     ApiSuccess<{ paiement: PaiementPopule; resumeFinancier: MetaPaiements }>
//   >('/cabinet/paiements', payload); // ✅ envoi direct, noms déjà corrects
//   return norm(data.data.paiement);
// }
