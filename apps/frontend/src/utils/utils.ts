import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StatutTenant, PlanTenant, StatutDossier } from '@/types';

// ─── shadcn — requis par tous les composants UI ───────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Formatage dates ──────────────────────────────────────────────────────────

// "24 mars 2026"
export function formaterDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

// "24/03/2026"
export function formaterDateCourte(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

// ─── Tenant ───────────────────────────────────────────────────────────────────

export function couleurStatutTenant(
  statut: StatutTenant
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<StatutTenant, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    actif: 'default',
    essai: 'secondary',
    suspendu: 'destructive',
    expire: 'outline',
  };
  return map[statut] ?? 'outline';
}

export function libellePlan(plan: PlanTenant): string {
  const map: Record<PlanTenant, string> = {
    starter: 'Starter',
    pro: 'Pro',
    premium: 'Premium',
  };
  return map[plan] ?? plan;
}

// ─── Dossiers ─────────────────────────────────────────────────────────────────

export function couleurStatutDossier(
  statut: StatutDossier
): 'default' | 'secondary' | 'outline' | 'destructive' {
  const map: Record<StatutDossier, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    encours: 'default',
    suspendu: 'secondary',
    cloture: 'outline',
  };
  return map[statut] ?? 'outline';
}

export function libelleStatutDossier(statut: StatutDossier): string {
  const map: Record<StatutDossier, string> = {
    encours: 'En cours',
    suspendu: 'Suspendu',
    cloture: 'Clôturé',
  };
  return map[statut] ?? statut;
}
