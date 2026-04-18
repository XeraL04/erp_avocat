import apiClient from './client';
import type { ApiSuccess } from '@/types';

export async function listerInstitutionsPersonnalisees(q?: string): Promise<string[]> {
  const data = await apiClient.get<ApiSuccess<string[]>>('/cabinet/institutions-personnalisees', {
    params: q ? { q } : {},
  });
  return data.data.data;
}

export async function enregistrerInstitutionPersonnalisee(nom: string): Promise<void> {
  await apiClient.post('/cabinet/institutions-personnalisees', { nom });
}
