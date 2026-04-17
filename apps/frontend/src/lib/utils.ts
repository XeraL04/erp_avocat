import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StatutTenant, PlanTenant, StatutDossier, TypeDossier, StatutFacture } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formaterDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formaterDateCourte(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formaterDateHeure(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// ─── Montants ─────────────────────────────────────────────────────────────────

// Évite Intl.NumberFormat('fr-DZ') → espace fine U+202F incompatible avec pdf-lib
export function formaterMontantDA(montant: number): string {
  const entiere = Math.floor(montant)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  const centimes = (montant % 1).toFixed(2).slice(1);
  return `${entiere}${centimes} DA`;
}

// Version courte sans centimes pour les KPIs
export function formaterMontantCourt(montant: number): string {
  if (montant >= 1_000_000) {
    return `${(montant / 1_000_000).toFixed(1).replace('.', ',')} M DA`;
  }
  if (montant >= 1_000) {
    return `${(montant / 1_000).toFixed(1).replace('.', ',')} K DA`;
  }
  return `${montant} DA`;
}

// ─── Statuts Dossier ──────────────────────────────────────────────────────────

export interface StatutStyle {
  text: string; // classe Tailwind couleur texte
  bg: string; // classe Tailwind couleur fond
  border: string; // classe Tailwind couleur bordure
  dot: string; // classe pour le petit indicateur rond
  label: string; // libellé français
}

export function styleStatutDossier(statut: StatutDossier): StatutStyle {
  const map: Record<StatutDossier, StatutStyle> = {
    en_cours: {
      text: 'text-status-encours',
      bg: 'bg-status-encours-bg',
      border: 'border-status-encours-border',
      dot: 'bg-status-encours',
      label: 'En cours',
    },
    suspendu: {
      text: 'text-status-suspendu',
      bg: 'bg-status-suspendu-bg',
      border: 'border-status-suspendu-border',
      dot: 'bg-status-suspendu',
      label: 'Suspendu',
    },
    cloture: {
      text: 'text-status-cloture',
      bg: 'bg-status-cloture-bg',
      border: 'border-status-cloture-border',
      dot: 'bg-status-cloture',
      label: 'Clôturé',
    },
  };
  return map[statut] ?? map.cloture;
}

// Garde la compatibilité avec le code existant qui attend une variante shadcn
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

export function libelleStatutDossier(statut: StatutDossier): string {
  return styleStatutDossier(statut).label;
}

// ─── Types Dossier ────────────────────────────────────────────────────────────

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

// ─── Statuts Tenant ───────────────────────────────────────────────────────────

export interface TenantStatutStyle {
  text: string;
  bg: string;
  dot: string;
  label: string;
  // variante shadcn pour les badges existants
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function styleStatutTenant(statut: StatutTenant): TenantStatutStyle {
  const map: Record<StatutTenant, TenantStatutStyle> = {
    actif: {
      text: 'text-status-actif',
      bg: 'bg-status-actif-bg',
      dot: 'bg-status-actif',
      label: 'Actif',
      variant: 'default',
    },
    essai: {
      text: 'text-status-essai',
      bg: 'bg-status-essai-bg',
      dot: 'bg-status-essai',
      label: 'Essai',
      variant: 'secondary',
    },
    suspendu: {
      text: 'text-destructive',
      bg: 'bg-destructive/10',
      dot: 'bg-destructive',
      label: 'Suspendu',
      variant: 'destructive',
    },
    expire: {
      text: 'text-status-expire',
      bg: 'bg-status-expire-bg',
      dot: 'bg-status-expire',
      label: 'Expiré',
      variant: 'outline',
    },
  };
  return map[statut] ?? map.expire;
}

// Garde la compatibilité avec le code existant
export function couleurStatutTenant(
  statut: StatutTenant
): 'default' | 'secondary' | 'destructive' | 'outline' {
  return styleStatutTenant(statut).variant;
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export interface PlanStyle {
  text: string;
  bg: string;
  label: string;
}

export function stylePlan(plan: PlanTenant): PlanStyle {
  const map: Record<PlanTenant, PlanStyle> = {
    starter: {
      text: 'text-plan-starter',
      bg: 'bg-plan-starter-bg',
      label: 'Starter',
    },
    pro: {
      text: 'text-plan-pro',
      bg: 'bg-plan-pro-bg',
      label: 'Pro',
    },
    premium: {
      text: 'text-plan-premium',
      bg: 'bg-plan-premium-bg',
      label: 'Premium',
    },
  };
  return map[plan] ?? map.starter;
}

export function libellePlan(plan: PlanTenant): string {
  return stylePlan(plan).label;
}

// ─── Statuts Facture ──────────────────────────────────────────────────────────

export interface FactureStatutStyle {
  text: string;
  bg: string;
  label: string;
  border: string;
  dot: string;
  variant: 'default' | 'secondary' | 'outline';
}

export function styleStatutFacture(statut: StatutFacture): FactureStatutStyle {
  switch (statut) {
    case 'brouillon':
      return {
        label: 'Brouillon',
        text: 'text-muted-foreground',
        bg: 'bg-muted/60',
        border: 'border-border',
        dot: 'bg-muted-foreground',
        variant: 'secondary',
      };
    case 'emise':
      return {
        label: 'Émise',
        text: 'text-status-encours',
        bg: 'bg-status-encours-bg',
        border: 'border-status-encours-border',
        dot: 'bg-status-encours',
        variant: 'default',
      };
    case 'payee':
      return {
        label: 'Payée',
        text: 'text-status-actif',
        bg: 'bg-status-actif-bg',
        border: 'border-status-actif/30',
        dot: 'bg-status-actif',
        variant: 'outline',
      };
    default:
      return {
        label: statut,
        text: 'text-muted-foreground',
        bg: 'bg-muted/60',
        border: 'border-border',
        dot: 'bg-muted-foreground',
        variant: 'secondary',
      };
  }
}

// Garde la compatibilité avec le code existant
export function couleurStatutFacture(statut: StatutFacture): 'secondary' | 'default' | 'outline' {
  return styleStatutFacture(statut).variant;
}

export function libelleStatutFacture(statut: StatutFacture): string {
  return styleStatutFacture(statut).label;
}

// ─── Modes de paiement ────────────────────────────────────────────────────────

export function libelleModeReglement(mode: string): string {
  const map: Record<string, string> = {
    especes: 'Espèces',
    virement: 'Virement',
    cheque: 'Chèque',
    autre: 'Autre',
  };
  return map[mode] ?? mode;
}

export function styleModeReglement(mode: string): { text: string; bg: string } {
  const map: Record<string, { text: string; bg: string }> = {
    especes: { text: 'text-mode-especes', bg: 'bg-mode-especes-bg' },
    virement: { text: 'text-mode-virement', bg: 'bg-mode-virement-bg' },
    cheque: { text: 'text-mode-cheque', bg: 'bg-mode-cheque-bg' },
    autre: { text: 'text-muted-foreground', bg: 'bg-muted' },
  };
  return map[mode] ?? { text: 'text-muted-foreground', bg: 'bg-muted' };
}

// ─── Noms clients ─────────────────────────────────────────────────────────────

export function nomAffiche(client: {
  type: 'physique' | 'morale';
  nom?: string;
  prenom?: string;
  raisonSociale?: string;
}): string {
  if (client.type === 'morale') return client.raisonSociale ?? '—';
  return [client.prenom, client.nom].filter(Boolean).join(' ') || '—';
}

// ─── Initiales avatar ─────────────────────────────────────────────────────────

export function initialesAvatar(nom: string): string {
  return nom
    .split(' ')
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('');
}
