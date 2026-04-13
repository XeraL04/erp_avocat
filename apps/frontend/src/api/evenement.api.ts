import apiClient from './client';
import type { ApiSuccess } from '../types';

export type TypeEvenement = 'audience' | 'rdv' | 'rappel';

export interface Evenement {
  _id: string;
  id: string;
  tenantId: string;
  titre: string;
  type: TypeEvenement;
  dateHeure: string;
  lieu?: string;
  dossier?: { id: string; reference: string; titre: string; type: string } | null;
  notes?: string;
  createdAt: string;
}

export interface CreerEvenementInput {
  titre: string;
  type: TypeEvenement;
  dateHeure: string;
  lieu?: string;
  dossierId?: string;
  notes?: string;
}

export type ModifierEvenementInput = Partial<CreerEvenementInput>;

export interface ParamsEvenements {
  type?: TypeEvenement;
  page?: number;
  limit?: number;
}

export async function listerEvenementsDossier(dossierId: string): Promise<Evenement[]> {
  const res = await apiClient.get<ApiSuccess<{ evenements: Evenement[] }>>(
    `/cabinet/dossiers/${dossierId}/evenements`
  );
  return res.data.data.evenements.map((e) => ({ ...e, id: e._id ?? e.id }));
}

export async function listerTousEvenements(params?: ParamsEvenements): Promise<{
  evenements: Evenement[];
  meta?: ApiSuccess<unknown>['meta'];
}> {
  const res = await apiClient.get<ApiSuccess<{ evenements: Evenement[] }>>('/cabinet/evenements', {
    params,
  });
  return {
    evenements: res.data.data.evenements.map((e) => ({ ...e, id: e._id ?? e.id })),
    meta: res.data.meta,
  };
}

export async function creerEvenement(data: CreerEvenementInput): Promise<Evenement> {
  const res = await apiClient.post<ApiSuccess<{ evenement: Evenement }>>(
    '/cabinet/evenements',
    data
  );
  const e = res.data.data.evenement;
  return { ...e, id: e._id ?? e.id };
}

export async function modifierEvenement(
  id: string,
  data: ModifierEvenementInput
): Promise<Evenement> {
  const res = await apiClient.put<ApiSuccess<{ evenement: Evenement }>>(
    `/cabinet/evenements/${id}`,
    data
  );
  const e = res.data.data.evenement;
  return { ...e, id: e._id ?? e.id };
}

export async function supprimerEvenement(id: string): Promise<void> {
  await apiClient.delete(`/cabinet/evenements/${id}`);
}
