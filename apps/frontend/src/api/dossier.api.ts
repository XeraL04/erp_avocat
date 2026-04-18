import apiClient from './client';
import type {
  ApiSuccess,
  StatutDossier,
  QualitePartie,
  TypeAffaire,
  SpecialiteDossier,
  InstitutionDossier,
  Dossier,
  ClientPopule,
  Report,
} from '@/types';

// ─── Paramètres de liste ──────────────────────────────────────────────────────

export interface ParamsDossiers {
  q?: string;
  statut?: StatutDossier;
  typeAffaire?: TypeAffaire; // ← remplace section
  specialite?: SpecialiteDossier; // ← nouveau
  institution?: InstitutionDossier;
  clientId?: string;
  page?: number;
  limit?: number;
}

// ─── Payloads mutations ───────────────────────────────────────────────────────

export interface PayloadCreerDossier {
  clientId: string;
  qualiteClient: QualitePartie;
  adversaire: string;
  qualiteAdversaire: QualitePartie;
  dossierNumero?: string;
  institution?: InstitutionDossier;
  nomInstitution?: string;
  typeAffaire?: TypeAffaire;
  specialite?: SpecialiteDossier;
  dateOuverture?: string;
  description?: string;
  reports?: PayloadReport[];
}

export interface PayloadModifierDossier {
  qualiteClient?: QualitePartie;
  adversaire?: string;
  qualiteAdversaire?: QualitePartie;
  dossierNumero?: string;
  institution?: InstitutionDossier;
  nomInstitution?: string | null;
  typeAffaire?: TypeAffaire;
  specialite?: SpecialiteDossier;
  dateOuverture?: string;
  dateCloture?: string | null;
  description?: string | null;
}

export interface PayloadChangerStatut {
  statut: StatutDossier;
  dateCloture?: string;
}

export interface PayloadReport {
  date: string;
  raison: string;
  jugement?: string;
}

export interface ReponsePaginee<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Re-export
export type { Dossier, ClientPopule, Report };

// ─── Fonctions API ────────────────────────────────────────────────────────────

export async function listerDossiers(params?: ParamsDossiers): Promise<ReponsePaginee<Dossier>> {
  const { data } = await apiClient.get<
    ApiSuccess<Dossier[]> & { meta: ReponsePaginee<Dossier>['meta'] }
  >('/cabinet/dossiers', { params });
  return { data: data.data, meta: data.meta! };
}

export async function creerDossier(payload: PayloadCreerDossier): Promise<Dossier> {
  const { data } = await apiClient.post<ApiSuccess<Dossier>>('/cabinet/dossiers', payload);
  return data.data;
}

export async function obtenirDossier(id: string): Promise<Dossier> {
  const { data } = await apiClient.get<ApiSuccess<Dossier>>(`/cabinet/dossiers/${id}`);
  return data.data;
}

export async function modifierDossier(
  id: string,
  payload: PayloadModifierDossier
): Promise<Dossier> {
  const { data } = await apiClient.put<ApiSuccess<Dossier>>(`/cabinet/dossiers/${id}`, payload);
  return data.data;
}

export async function supprimerDossier(id: string): Promise<void> {
  await apiClient.delete(`/cabinet/dossiers/${id}`);
}

export async function changerStatutDossier(
  id: string,
  payload: PayloadChangerStatut
): Promise<Dossier> {
  const { data } = await apiClient.patch<ApiSuccess<Dossier>>(
    `/cabinet/dossiers/${id}/statut`,
    payload
  );
  return data.data;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function ajouterReport(dossierId: string, payload: PayloadReport): Promise<Report[]> {
  const { data } = await apiClient.post<ApiSuccess<Report[]>>(
    `/cabinet/dossiers/${dossierId}/reports`,
    payload
  );
  return data.data;
}

export async function modifierReport(
  dossierId: string,
  reportId: string,
  payload: PayloadReport
): Promise<Dossier> {
  const { data } = await apiClient.put<ApiSuccess<Dossier>>(
    `/cabinet/dossiers/${dossierId}/reports/${reportId}`,
    payload
  );
  return data.data;
}

export async function supprimerReport(dossierId: string, reportId: string): Promise<void> {
  await apiClient.delete(`/cabinet/dossiers/${dossierId}/reports/${reportId}`);
}
