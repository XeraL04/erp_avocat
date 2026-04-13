import apiClient from './client';
import type { ApiSuccess, Tenant, TypeDossier, StatutDossier, ClientNommable } from '@/types';

export interface StatsCabinet {
  totalDossiers: number;
  dossiersEnCours: number;
  dossiersSuspendus: number;
  dossiersClotures: number;
  totalUtilisateurs: number;
}

export interface ClientResume extends ClientNommable {
  _id: string;
  telephone: string;
}

// Interface minimale du client retourné par le populate
export interface ClientResume {
  _id: string;
  type: 'physique' | 'morale';
  nom?: string;
  prenom?: string;
  raisonSociale?: string;
  telephone: string;
}

export interface DossierResume {
  _id: string;
  reference: string;
  titre: string;
  statut: StatutDossier; // ← 'en_cours' | 'suspendu' | 'cloture' depuis types/index.ts
  type: TypeDossier; // ← 'civil' | 'penal' | 'commercial' | 'administratif' | 'autre'
  dateOuverture: string;
  client: ClientResume | null;
}

export interface DashboardCabinetData {
  stats: StatsCabinet;
  cabinet: Pick<Tenant, '_id' | 'nom' | 'plan' | 'statut' | 'limites' | 'compteurs'>;
  derniersDossiers: DossierResume[];
}

export async function getDashboardCabinet(): Promise<DashboardCabinetData> {
  const { data } = await apiClient.get<ApiSuccess<DashboardCabinetData>>('/cabinet/dashboard');
  return data.data;
}
