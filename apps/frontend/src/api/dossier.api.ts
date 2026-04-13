import apiClient from './client';
import type { ApiSuccess, TypeDossier, StatutDossier, Dossier, ClientPopule } from '@/types';

// ─── Paramètres de liste ──────────────────────────────────────────────────────
export interface ParamsDossiers {
  q?: string;
  statut?: StatutDossier;
  type?: TypeDossier;
  client?: string;
  page?: number;
  limit?: number;
}

// ─── Payloads mutations ───────────────────────────────────────────────────────
export interface PayloadCreerDossier {
  titre: string;
  client: string;
  type: TypeDossier;
  description?: string;
  dateOuverture?: string;
}

export interface PayloadModifierDossier {
  titre?: string;
  type?: TypeDossier;
  description?: string | null;
  dateOuverture?: string;
  dateCloture?: string | null;
}

export interface PayloadChangerStatut {
  statut: StatutDossier;
  dateCloture?: string;
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

// Re-exporter pour que les pages puissent tout importer depuis dossier.api.ts
export type { Dossier, ClientPopule };

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
