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

export interface Cabinet {
  _id: string;
  nom: string;
  slug: string;
  email: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  numeroFiscal?: string;
  rib?: string;
  tva?: number;
  plan: 'starter' | 'pro' | 'premium';
  statut: string;
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

export interface PayloadMonProfil {
  nom?: string;
  email?: string;
  motDePasse?: string;
  ancienMotDePasse?: string;
}

export interface PayloadMonCabinet {
  nom?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  numeroFiscal?: string;
  rib?: string;
  tva?: number;
}

// ─── Assistants ───────────────────────────────────────────────────────────────

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

// ─── Profil personnel ─────────────────────────────────────────────────────────

export async function obtenirMonProfil(): Promise<Utilisateur> {
  const { data } = await apiClient.get<ApiSuccess<{ utilisateur: Utilisateur }>>(
    '/cabinet/utilisateurs/profil'
  );
  return data.data.utilisateur;
}

export async function modifierMonProfil(payload: PayloadMonProfil): Promise<Utilisateur> {
  const { data } = await apiClient.put<ApiSuccess<{ utilisateur: Utilisateur }>>(
    '/cabinet/utilisateurs/profil',
    payload
  );
  return data.data.utilisateur;
}

// ─── Cabinet ──────────────────────────────────────────────────────────────────

export async function obtenirMonCabinet(): Promise<Cabinet> {
  const { data } = await apiClient.get<ApiSuccess<{ cabinet: Cabinet }>>(
    '/cabinet/utilisateurs/mon-cabinet'
  );
  return data.data.cabinet;
}

export async function modifierMonCabinet(payload: PayloadMonCabinet): Promise<Cabinet> {
  const { data } = await apiClient.put<ApiSuccess<{ cabinet: Cabinet }>>(
    '/cabinet/utilisateurs/mon-cabinet',
    payload
  );
  return data.data.cabinet;
}

// import apiClient from './client';
// import type { ApiSuccess } from '@/types';

// export interface Utilisateur {
//   _id: string;
//   nom: string;
//   email: string;
//   role: 'admin' | 'assistant';
//   actif: boolean;
//   tenantId: string;
//   createdAt: string;
// }

// export interface PayloadCreerAssistant {
//   nom: string;
//   email: string;
//   motDePasse: string;
// }

// export interface PayloadModifierAssistant {
//   nom?: string;
//   email?: string;
//   motDePasse?: string;
// }

// export async function listerUtilisateurs(): Promise<Utilisateur[]> {
//   const { data } =
//     await apiClient.get<ApiSuccess<{ utilisateurs: Utilisateur[] }>>('/cabinet/utilisateurs');
//   return data.data.utilisateurs;
// }

// export async function creerAssistant(payload: PayloadCreerAssistant): Promise<Utilisateur> {
//   const { data } = await apiClient.post<ApiSuccess<{ utilisateur: Utilisateur }>>(
//     '/cabinet/utilisateurs',
//     payload
//   );
//   return data.data.utilisateur;
// }

// export async function modifierUtilisateur(
//   id: string,
//   payload: PayloadModifierAssistant
// ): Promise<Utilisateur> {
//   const { data } = await apiClient.put<ApiSuccess<{ utilisateur: Utilisateur }>>(
//     `/cabinet/utilisateurs/${id}`,
//     payload
//   );
//   return data.data.utilisateur;
// }

// export async function changerStatutUtilisateur(id: string, actif: boolean): Promise<Utilisateur> {
//   const { data } = await apiClient.patch<ApiSuccess<{ utilisateur: Utilisateur }>>(
//     `/cabinet/utilisateurs/${id}/statut`,
//     { actif }
//   );
//   return data.data.utilisateur;
// }

// export async function supprimerUtilisateur(id: string): Promise<void> {
//   await apiClient.delete(`/cabinet/utilisateurs/${id}`);
// }
