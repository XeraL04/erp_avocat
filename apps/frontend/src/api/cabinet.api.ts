import apiClient from './client';
import type {
  ApiSuccess,
  Tenant,
  StatutDossier,
  TypeAffaire, // ← remplace SectionDossier
  SpecialiteDossier, // ← nouveau
  InstitutionDossier,
  ClientNommable,
} from '@/types';

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

export interface DossierResume {
  _id: string;
  reference: string;
  statut: StatutDossier;
  dateOuverture: string;

  clientId?: ClientResume | string | null;
  adversaire?: string;
  dossierNumero?: string;
  typeAffaire?: TypeAffaire;
  specialite?: SpecialiteDossier;
  institution?: InstitutionDossier;
  nomInstitution?: string;
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
