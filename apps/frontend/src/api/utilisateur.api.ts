import apiClient from './client';
import type { ApiSuccess } from '@/types';

export interface Utilisateur {
  _id: string;
  nom: string;
  email: string;
  role: 'admin' | 'assistant';
  actif: boolean;
  tenantId: string;
  createdAt: string;
}

export interface PayloadCreerAssistant {
  nom: string;
  email: string;
  motDePasse: string;
}

export interface PayloadModifierAssistant {
  nom?: string;
  email?: string;
  motDePasse?: string;
}

export async function listerUtilisateurs(): Promise<Utilisateur[]> {
  const { data } =
    await apiClient.get<ApiSuccess<{ utilisateurs: Utilisateur[] }>>('/cabinet/utilisateurs');
  return data.data.utilisateurs;
}

export async function creerAssistant(payload: PayloadCreerAssistant): Promise<Utilisateur> {
  const { data } = await apiClient.post<ApiSuccess<{ utilisateur: Utilisateur }>>(
    '/cabinet/utilisateurs',
    payload
  );
  return data.data.utilisateur;
}

export async function modifierUtilisateur(
  id: string,
  payload: PayloadModifierAssistant
): Promise<Utilisateur> {
  const { data } = await apiClient.put<ApiSuccess<{ utilisateur: Utilisateur }>>(
    `/cabinet/utilisateurs/${id}`,
    payload
  );
  return data.data.utilisateur;
}

export async function changerStatutUtilisateur(id: string, actif: boolean): Promise<Utilisateur> {
  const { data } = await apiClient.patch<ApiSuccess<{ utilisateur: Utilisateur }>>(
    `/cabinet/utilisateurs/${id}/statut`,
    { actif }
  );
  return data.data.utilisateur;
}

export async function supprimerUtilisateur(id: string): Promise<void> {
  await apiClient.delete(`/cabinet/utilisateurs/${id}`);
}
