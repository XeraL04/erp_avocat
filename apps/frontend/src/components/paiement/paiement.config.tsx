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

export const CONFIG_MODE: Record<
  ModePaiement,
  {
    label: string;
    Icone: LucideIcon;
    badgeStyle: { color: string; backgroundColor: string };
  }
> = {
  cash: {
    label: 'Espèces',
    Icone: Banknote,
    badgeStyle: {
      color: 'var(--mode-especes)',
      backgroundColor: 'var(--mode-especes-bg)',
    },
  },
  virement: {
    label: 'Virement',
    Icone: CreditCard,
    badgeStyle: {
      color: 'var(--mode-virement)',
      backgroundColor: 'var(--mode-virement-bg)',
    },
  },
  ccp: {
    label: 'CCP',
    Icone: Wallet,
    badgeStyle: {
      color: 'var(--mode-cheque)',
      backgroundColor: 'var(--mode-cheque-bg)',
    },
  },
};

// ─── Config statuts honoraire ─────────────────────────────────────────────────

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
      color: 'var(--destructive)',
      backgroundColor: 'color-mix(in oklch, var(--destructive) 10%, transparent)',
    },
  },
  partiel: {
    label: 'Partiel',
    Icone: Clock,
    style: {
      color: 'var(--status-suspendu)',
      backgroundColor: 'var(--status-suspendu-bg)',
    },
  },
  paye: {
    label: 'Réglé',
    Icone: CheckCircle,
    style: {
      color: 'var(--status-encours)',
      backgroundColor: 'var(--status-encours-bg)',
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

export type DossierSelectorItem = { _id: string; reference: string; titre: string };
