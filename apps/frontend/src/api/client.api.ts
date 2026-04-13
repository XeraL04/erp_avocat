import apiClient from './client';
import type { ApiSuccess, Client, TypeClient } from '@/types';

export interface ParamsClients {
  q?: string;
  telephone?: string;
  type?: TypeClient;
  page?: number;
  limit?: number;
}

export interface PayloadCreerClient {
  type: TypeClient;
  // Physique
  nom?: string;
  prenom?: string;
  cin?: string;
  // Morale
  raisonSociale?: string;
  representantLegal?: string;
  nifRc?: string;
  // Communs
  telephone: string;
  telephoneSecondaire?: string;
  email?: string;
  adresse?: string;
  notes?: string;
}

export type PayloadModifierClient = Omit<PayloadCreerClient, 'type'>;

export interface ReponsePaginee<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Types dossiers / paiements retournés par le détail client ────────────────

export interface DossierResume {
  _id: string;
  titre: string;
  reference: string;
  statut: string;
  dateOuverture: string;
}

export interface PaiementResume {
  _id: string;
  montant: number;
  date: string;
  modePaiement?: string;
  dossier?: { _id: string; titre: string; reference: string; statut: string };
}

// ─── Fonctions API ────────────────────────────────────────────────────────────

export async function listerClients(params?: ParamsClients): Promise<ReponsePaginee<Client>> {
  const { data } = await apiClient.get<
    ApiSuccess<Client[]> & { meta: ReponsePaginee<Client>['meta'] }
  >('/cabinet/clients', { params });
  return { data: data.data, meta: data.meta! };
}

export async function creerClient(payload: PayloadCreerClient): Promise<Client> {
  const { data } = await apiClient.post<ApiSuccess<Client>>('/cabinet/clients', payload);
  return data.data;
}

export async function obtenirClient(id: string): Promise<Client> {
  const { data } = await apiClient.get<ApiSuccess<Client>>(`/cabinet/clients/${id}`);
  return data.data;
}

export async function modifierClient(id: string, payload: PayloadModifierClient): Promise<Client> {
  const { data } = await apiClient.put<ApiSuccess<Client>>(`/cabinet/clients/${id}`, payload);
  return data.data;
}

export async function supprimerClient(id: string): Promise<void> {
  await apiClient.delete(`/cabinet/clients/${id}`);
}

// ─── Nouvelles fonctions ──────────────────────────────────────────────────────

export async function obtenirDossiersClient(id: string): Promise<{
  data: DossierResume[];
  meta: { total: number };
}> {
  const { data } = await apiClient.get<ApiSuccess<DossierResume[]> & { meta: { total: number } }>(
    `/cabinet/clients/${id}/dossiers`
  );
  return { data: data.data, meta: data.meta! };
}

export async function obtenirPaiementsClient(id: string): Promise<{
  data: PaiementResume[];
  meta: { total: number; totalPaye: number; devise: string };
}> {
  const { data } = await apiClient.get<
    ApiSuccess<PaiementResume[]> & {
      meta: { total: number; totalPaye: number; devise: string };
    }
  >(`/cabinet/clients/${id}/paiements`);
  return { data: data.data, meta: data.meta! };
}
