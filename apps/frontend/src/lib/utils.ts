import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StatutTenant, PlanTenant, StatutDossier, TypeDossier } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date → "24 mars 2026"
export function formaterDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

// Format date courte → "24/03/2026"
export function formaterDateCourte(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

// Couleur badge statut tenant
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

// Couleur badge statut dossier
export function couleurStatutDossier(
  statut: StatutDossier
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<StatutDossier, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    en_cours: 'default',
    suspendu: 'secondary',
    cloture: 'outline',
  };
  return map[statut] ?? 'outline';
}

// Libellé lisible statut dossier
export function libelleStatutDossier(statut: StatutDossier): string {
  const map: Record<StatutDossier, string> = {
    en_cours: 'En cours',
    suspendu: 'Suspendu',
    cloture: 'Clôturé',
  };
  return map[statut] ?? statut;
}

// Libellé type dossier
export function libelleTypeDossier(type: TypeDossier): string {
  const map: Record<TypeDossier, string> = {
    civil: 'Civil',
    penal: 'Pénal',
    commercial: 'Commercial',
    administratif: 'Administratif',
    autre: 'Autre',
  };
  return map[type] ?? type;
}

// Libellé plan
export function libellePlan(plan: PlanTenant): string {
  const map: Record<PlanTenant, string> = {
    starter: 'Starter',
    pro: 'Pro',
    premium: 'Premium',
  };
  return map[plan] ?? plan;
}

// ─── À ajouter dans lib/utils.ts ──────────────────────────────────────────────

// import type { StatutFacture } from '@/api/facture.api';
import type { StatutFacture } from '@/types';

export function couleurStatutFacture(
  statut: StatutFacture,
): 'secondary' | 'default' | 'outline' {
  const map: Record<StatutFacture, 'secondary' | 'default' | 'outline'> = {
    brouillon: 'secondary',
    emise: 'default',
    payee: 'outline',
  };
  return map[statut] ?? 'secondary';
}

export function libelleStatutFacture(statut: StatutFacture): string {
  const map: Record<StatutFacture, string> = {
    brouillon: 'Brouillon',
    emise: 'Émise',
    payee: 'Payée',
  };
  return map[statut] ?? statut;
}

// Évite Intl.NumberFormat('fr-DZ') → espace fine U+202F incompatible avec pdf-lib
export function formaterMontantDA(montant: number): string {
  const partie = Math.floor(montant)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const centimes = (montant % 1).toFixed(2).slice(1);
  return `${partie}${centimes} DA`;
}