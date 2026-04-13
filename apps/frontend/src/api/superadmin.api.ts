import apiClient from './client';
import type { ApiSuccess, Tenant, TenantDetail } from '@/types';

// Structure réelle retournée par GET /superadmin/dashboard
export interface StatsDashboard {
  totalTenants: number;
  tenantsActifs: number;
  tenantsSuspendus: number;
  tenantsEssai: number;
  tenantsExpires: number;
}

export interface DashboardData {
  stats: StatsDashboard;
  derniersInscrits: Pick<Tenant, '_id' | 'nom' | 'email' | 'plan' | 'statut'>[];
}

export interface PayloadCreerTenant {
  nom: string;
  slug: string;
  email: string;
  telephone?: string;
  adresse?: string;
  plan: 'starter' | 'pro' | 'premium';
  adminNom: string;
  adminEmail: string;
  adminMotDePasse: string;
}

export interface PayloadModifierTenant {
  nom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  plan?: 'starter' | 'pro' | 'premium';
}

export interface ParamsTenants {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string;
  plan?: string;
}

// Réponse réelle de GET /superadmin/tenants
interface ReponseTenants {
  tenants: Tenant[];
}

// Réponse réelle de GET /superadmin/tenants/:id
interface ReponseTenantDetail {
  tenant: Tenant;
  utilisateurs: TenantDetail['utilisateurs'];
}

// Stats dashboard — extrait data.data.stats
export async function getStatsDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get<ApiSuccess<DashboardData>>('/superadmin/dashboard');
  return data.data;
}

// Liste cabinets — data.data est { tenants: [...] }
export async function getTenants(params?: ParamsTenants): Promise<{
  tenants: Tenant[];
  meta: { page: number; limit: number; total: number };
}> {
  const { data } = await apiClient.get<ApiSuccess<ReponseTenants>>('/superadmin/tenants', {
    params,
  });
  return { tenants: data.data.tenants, meta: data.meta! };
}

// Détail cabinet — data.data est { tenant, utilisateurs }
export async function getTenantDetail(id: string): Promise<TenantDetail> {
  const { data } = await apiClient.get<ApiSuccess<ReponseTenantDetail>>(
    `/superadmin/tenants/${id}`
  );
  // Fusionner tenant + utilisateurs en un seul objet TenantDetail
  return { ...data.data.tenant, utilisateurs: data.data.utilisateurs };
}

export async function creerTenant(payload: PayloadCreerTenant): Promise<Tenant> {
  const { data } = await apiClient.post<ApiSuccess<{ tenant: Tenant }>>(
    '/superadmin/tenants',
    payload
  );
  return data.data.tenant;
}

export async function modifierTenant(id: string, payload: PayloadModifierTenant): Promise<Tenant> {
  const { data } = await apiClient.put<ApiSuccess<{ tenant: Tenant }>>(
    `/superadmin/tenants/${id}`,
    payload
  );
  return data.data.tenant;
}

export async function changerStatutTenant(
  id: string,
  statut: 'actif' | 'suspendu' | 'expire'
): Promise<Tenant> {
  const { data } = await apiClient.patch<ApiSuccess<{ tenant: Tenant }>>(
    `/superadmin/tenants/${id}/statut`,
    { statut }
  );
  return data.data.tenant;
}
