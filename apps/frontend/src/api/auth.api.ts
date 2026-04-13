import type { AxiosError } from 'axios';
import apiClient from './client';
import type { ApiSuccess, UtilisateurProfil } from '@/types';

export interface PayloadLogin {
  email: string;
  motDePasse: string;
}

export interface ReponseLogin {
  accessToken: string;
  utilisateur: UtilisateurProfil;
}

// Fonction nommée ET exportée explicitement — résout "has no exported member"
export async function login(payload: PayloadLogin): Promise<ReponseLogin> {
  const { data } = await apiClient.post<ApiSuccess<ReponseLogin>>('/auth/login', payload);
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function getMonProfil(): Promise<UtilisateurProfil> {
  const { data } = await apiClient.get<ApiSuccess<UtilisateurProfil>>('/auth/me');
  return data.data;
}

export async function changerMotDePasse(payload: {
  ancienMotDePasse: string;
  nouveauMotDePasse: string;
}): Promise<void> {
  await apiClient.put('/auth/password', payload);
}

// Helper pour extraire le message d'erreur Axios — évite les "any"
export function extraireMessageErreur(erreur: unknown): string {
  const axiosErreur = erreur as AxiosError<{ message: string }>;
  return (
    axiosErreur?.response?.data?.message ??
    (erreur instanceof Error ? erreur.message : 'Une erreur est survenue')
  );
}
