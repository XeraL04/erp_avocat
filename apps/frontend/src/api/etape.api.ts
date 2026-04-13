import apiClient from './client';
import type { ApiSuccess } from '../types';

export type StatutEtape = 'termine' | 'enattente';

export interface Etape {
  _id: string;
  id: string;
  tenantId: string;
  dossier: string;
  nom: string;
  date: string;
  statut: StatutEtape;
  notes?: string;
  createdAt: string;
}

export interface CreerEtapeInput {
  nom: string;
  date: string; // ISO 8601
  statut?: StatutEtape;
  notes?: string;
}

export interface EtapeAvecDossier extends Omit<Etape, 'dossier'> {
  dossier: {
    _id: string;
    reference: string;
    titre: string;
    type: string;
    statut: string;
  };
}

export interface ParamsEtapes {
  statut?: StatutEtape;
  dossierId?: string;
  dateDebut?: string; // ISO
  dateFin?: string; // ISO
}

export type ModifierEtapeInput = Partial<CreerEtapeInput>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliser(e: Etape): Etape {
  return { ...e, id: e._id ?? e.id };
}

/** "2026-04-15T09:00:00.000Z" → "2026-04-15" pour <input type="date"> */
export function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

/** "2026-04-15" → "2026-04-15T00:00:00.000Z" (sans ambiguïté timezone) */
export function dateInputToISO(d: string): string {
  return `${d}T00:00:00.000Z`;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function listerToutesEtapes(params?: ParamsEtapes): Promise<EtapeAvecDossier[]> {
  const res = await apiClient.get<ApiSuccess<{ etapes: EtapeAvecDossier[] }>>('/cabinet/etapes', {
    params,
  });
  return res.data.data.etapes.map((e) => ({ ...e, id: e._id ?? e.id }));
}

export async function listerEtapesDossier(dossierId: string): Promise<Etape[]> {
  const res = await apiClient.get<ApiSuccess<{ etapes: Etape[] }>>(
    `/cabinet/dossiers/${dossierId}/etapes`
  );
  return res.data.data.etapes.map(normaliser);
}

export async function creerEtape(dossierId: string, data: CreerEtapeInput): Promise<Etape> {
  const res = await apiClient.post<ApiSuccess<{ etape: Etape }>>(
    `/cabinet/dossiers/${dossierId}/etapes`,
    data
  );
  return normaliser(res.data.data.etape);
}

export async function modifierEtape(id: string, data: ModifierEtapeInput): Promise<Etape> {
  const res = await apiClient.put<ApiSuccess<{ etape: Etape }>>(`/cabinet/etapes/${id}`, data);
  return normaliser(res.data.data.etape);
}

export async function supprimerEtape(id: string): Promise<void> {
  await apiClient.delete(`/cabinet/etapes/${id}`);
}
