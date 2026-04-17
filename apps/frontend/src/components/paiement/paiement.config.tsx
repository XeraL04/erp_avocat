// paiement.config.ts  ← redevient .ts (plus de JSX direct)
import {
  Banknote,
  CreditCard,
  Wallet,
  AlertCircle,
  Clock,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { z } from 'zod';
import type { ModePaiement } from '@/api/paiement.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formaterMontant(montant: number): string {
  return new Intl.NumberFormat('fr-DZ').format(montant) + ' DA';
}

// ─── Config modes de paiement ─────────────────────────────────────────────────
// FIX #2 : on stocke le composant Lucide, pas l'instance JSX
// FIX #1 : couleurs via variables CSS plutôt que classes Tailwind statiques

export const CONFIG_MODE: Record<
  ModePaiement,
  {
    label: string;
    Icone: LucideIcon;
    // style inline pour badge — s'adapte automatiquement au dark mode
    badgeStyle: { color: string; backgroundColor: string };
  }
> = {
  cash: {
    label: 'Espèces',
    Icone: Banknote,
    badgeStyle: {
      color: 'var(--color-success)',
      backgroundColor: 'color-mix(in oklch, var(--color-success) 12%, transparent)',
    },
  },
  virement: {
    label: 'Virement',
    Icone: CreditCard,
    badgeStyle: {
      color: 'var(--color-blue)',
      backgroundColor: 'color-mix(in oklch, var(--color-blue) 12%, transparent)',
    },
  },
  ccp: {
    label: 'CCP',
    Icone: Wallet,
    badgeStyle: {
      color: 'var(--color-purple)',
      backgroundColor: 'color-mix(in oklch, var(--color-purple) 12%, transparent)',
    },
  },
};

// ─── Config statuts honoraire ─────────────────────────────────────────────────
// FIX #1 : même approche — style inline via variables CSS sémantiques

export const CONFIG_STATUT: Record<
  'non_paye' | 'partiel' | 'paye',
  {
    label: string;
    Icone: LucideIcon;
    style: { color: string; backgroundColor: string };
  }
> = {
  non_paye: {
    label: 'Non réglé',
    Icone: AlertCircle,
    style: {
      color: 'var(--color-error)',
      backgroundColor: 'color-mix(in oklch, var(--color-error) 12%, transparent)',
    },
  },
  partiel: {
    label: 'Partiel',
    Icone: Clock,
    style: {
      color: 'var(--color-warning)',
      backgroundColor: 'color-mix(in oklch, var(--color-warning) 12%, transparent)',
    },
  },
  paye: {
    label: 'Réglé',
    Icone: CheckCircle,
    style: {
      color: 'var(--color-success)',
      backgroundColor: 'color-mix(in oklch, var(--color-success) 12%, transparent)',
    },
  },
};

export type StatutKey = keyof typeof CONFIG_STATUT;
export type FiltreModeType = ModePaiement | 'tous';

// ─── Schémas Zod ──────────────────────────────────────────────────────────────

export const schemaCreer = z.object({
  dossierId: z.string().min(1, 'Sélectionnez un dossier'),
  honoraireId: z.string().min(1, "L'honoraire est requis"),
  montant: z
    .number({ invalid_type_error: 'Montant invalide' })
    .positive('Le montant doit être positif'),
  mode: z.enum(['cash', 'virement', 'ccp'] as const),
  date: z.string().min(1, 'La date est obligatoire'),
  reference: z.string().optional(),
  note: z.string().optional(),
});
export type FormCreer = z.infer<typeof schemaCreer>;

// FIX #3 : montant requis dans le formulaire de modification
// (le backend l'accepte optionnel pour PATCH partiel, mais l'UI exige toujours un montant)
export const schemaModifier = z.object({
  montant: z
    .number({ invalid_type_error: 'Montant invalide' })
    .positive('Le montant doit être positif'),
  mode: z.enum(['cash', 'virement', 'ccp'] as const),
  date: z.string().min(1, 'La date est obligatoire'),
  reference: z.string().optional(),
  note: z.string().optional(),
});
export type FormModifier = z.infer<typeof schemaModifier>;

// Type local pour l'autocomplete dossier (MongoDB retourne _id avec lean())
export type DossierSelectorItem = { _id: string; reference: string; titre: string };
