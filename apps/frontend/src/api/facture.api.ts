import apiClient from './client';
import type { ApiSuccess, StatutFacture, DossierPopuleFacture, ClientPopule } from '@/types';
import { useAuthStore } from '@/stores/auth.store';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ParamsFactures {
  q?: string;
  statut?: StatutFacture;
  dossierId?: string;
  page?: number;
  limit?: number;
}

export interface PayloadCreerFacture {
  clientId: string;
  dossierId: string;
  montant: number;
  dateEmission?: string;
}

export interface PayloadModifierFacture {
  montant?: number;
  statut?: StatutFacture;
}

// Type Facture — utilise ClientPopule et DossierPopuleFacture de @/types
export interface Facture {
  id: string;
  _id: string;
  tenantId: string;
  numero: string;
  client: ClientPopule | string; // ← type de @/types
  dossier: DossierPopuleFacture | string; // ← type de @/types
  montant: number;
  dateEmission: string;
  statut: StatutFacture;
  createdAt: string;
  updatedAt: string;
}

export interface ReponsePagineeFacture {
  data: Facture[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Normalisation _id → id ──────────────────────────────────────────────────

function normaliserObjetImbrique(obj: unknown): unknown {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const o = obj as Record<string, unknown>;
    return { ...o, id: (o._id ?? o.id) as string };
  }
  return obj;
}

function normaliserFacture(f: Record<string, unknown>): Facture {
  return {
    ...f,
    id: (f._id ?? f.id) as string,
    dossier: normaliserObjetImbrique(f.dossier) as Facture['dossier'],
    client: normaliserObjetImbrique(f.client) as Facture['client'],
  } as Facture;
}

// ─── Fonctions API ────────────────────────────────────────────────────────────

export async function listerFactures(params?: ParamsFactures): Promise<ReponsePagineeFacture> {
  const response = await apiClient.get<
    ApiSuccess<{ factures: Record<string, unknown>[] }> & {
      meta: ReponsePagineeFacture['meta'];
    }
  >('cabinet/factures', { params });

  return {
    data: (response.data.data.factures ?? []).map(normaliserFacture),
    meta: response.data.meta!,
  };
}

export async function listerFacturesDossier(dossierId: string): Promise<Facture[]> {
  const response = await apiClient.get<ApiSuccess<{ factures: Record<string, unknown>[] }>>(
    'cabinet/factures',
    { params: { dossierId } }
  );

  return (response.data.data.factures ?? []).map(normaliserFacture);
}

export async function creerFacture(payload: PayloadCreerFacture): Promise<Facture> {
  const response = await apiClient.post<ApiSuccess<{ facture: Record<string, unknown> }>>(
    'cabinet/factures',
    payload
  );

  return normaliserFacture(response.data.data.facture);
}

export async function obtenirFacture(id: string): Promise<Facture> {
  const response = await apiClient.get<ApiSuccess<{ facture: Record<string, unknown> }>>(
    `cabinet/factures/${id}`
  );

  return normaliserFacture(response.data.data.facture);
}

export async function modifierFacture(
  id: string,
  payload: PayloadModifierFacture
): Promise<Facture> {
  const response = await apiClient.put<ApiSuccess<{ facture: Record<string, unknown> }>>(
    `cabinet/factures/${id}`,
    payload
  );

  return normaliserFacture(response.data.data.facture);
}

export async function supprimerFacture(id: string): Promise<void> {
  await apiClient.delete(`cabinet/factures/${id}`);
}

export async function telechargerFacturePDF(id: string, numero: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const apiUrl = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:3000/api';

  const response = await fetch(`${apiUrl}/cabinet/factures/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Erreur lors de la génération du PDF');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${numero}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type { StatutFacture };
