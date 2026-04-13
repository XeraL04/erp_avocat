import apiClient from './client';
import type { ApiSuccess, Honoraire } from '@/types';

export type { Honoraire } from '@/types';

export interface ReponseHonoraire {
  honoraire: Honoraire;
  totalPaye: number;
  resteAPayer: number;
  statut: 'nonpaye' | 'partiel' | 'paye';
  devise: string;
}

export interface PayloadHonoraire {
  type: 'forfait' | 'echelonne';
  montantTotal: number;
  description?: string;
}

// GET /cabinet/dossiers/:id/honoraire
// Réponse backend : { success: true, data: { honoraire: {...}, totalPaye: 0, resteAPayer: 50000, statut: 'nonpaye', devise: 'DA' } }
export async function obtenirHonoraire(dossierId: string): Promise<ReponseHonoraire | null> {
  try {
    const { data } = await apiClient.get<ApiSuccess<ReponseHonoraire>>(
      `/cabinet/dossiers/${dossierId}/honoraire`
    );
    // ✅ data.data = { honoraire: {...}, totalPaye: 0, resteAPayer: 50000, statut, devise }
    return data.data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 404) return null; // aucun honoraire défini → valide
    throw err; // toute autre erreur → isError = true dans useQuery
  }
}

// POST /cabinet/dossiers/:id/honoraire
export async function definirHonoraire(
  dossierId: string,
  payload: PayloadHonoraire
): Promise<ReponseHonoraire> {
  const { data } = await apiClient.post<ApiSuccess<ReponseHonoraire>>(
    `/cabinet/dossiers/${dossierId}/honoraire`,
    payload
  );
  return data.data;
}

// PUT /cabinet/dossiers/:id/honoraire
export async function modifierHonoraire(
  dossierId: string,
  payload: Partial<PayloadHonoraire>
): Promise<ReponseHonoraire> {
  const { data } = await apiClient.put<ApiSuccess<ReponseHonoraire>>(
    `/cabinet/dossiers/${dossierId}/honoraire`,
    payload
  );
  return data.data;
}

// DELETE /cabinet/dossiers/:id/honoraire
export async function supprimerHonoraire(dossierId: string): Promise<void> {
  await apiClient.delete(`/cabinet/dossiers/${dossierId}/honoraire`);
}
