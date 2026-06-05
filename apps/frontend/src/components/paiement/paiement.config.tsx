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
import type { TFunction } from 'i18next';
import type { ModePaiement } from '@/api/paiement.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formaterMontant(montant: number, locale = 'fr-DZ'): string {
  return new Intl.NumberFormat(locale).format(montant) + ' DA';
}

// ─── Config modes de paiement ─────────────────────────────────────────────────

export function getConfigMode(t: TFunction): Record<
  ModePaiement,
  {
    label: string;
    Icone: LucideIcon;
    badgeStyle: { color: string; backgroundColor: string };
  }
> {
  return {
    cash: {
      label: t('paiements:mode_cash'),
      Icone: Banknote,
      badgeStyle: {
        color: 'var(--mode-especes)',
        backgroundColor: 'var(--mode-especes-bg)',
      },
    },
    virement: {
      label: t('paiements:mode_virement'),
      Icone: CreditCard,
      badgeStyle: {
        color: 'var(--mode-virement)',
        backgroundColor: 'var(--mode-virement-bg)',
      },
    },
    ccp: {
      label: t('paiements:mode_ccp'),
      Icone: Wallet,
      badgeStyle: {
        color: 'var(--mode-cheque)',
        backgroundColor: 'var(--mode-cheque-bg)',
      },
    },
  };
}

// ─── Config statuts honoraire ─────────────────────────────────────────────────

export function getConfigStatut(t: TFunction): Record<
  'non_paye' | 'partiel' | 'paye',
  {
    label: string;
    Icone: LucideIcon;
    style: { color: string; backgroundColor: string };
  }
> {
  return {
    non_paye: {
      label: t('paiements:statut_non_paye'),
      Icone: AlertCircle,
      style: {
        color: 'var(--destructive)',
        backgroundColor: 'color-mix(in oklch, var(--destructive) 10%, transparent)',
      },
    },
    partiel: {
      label: t('paiements:statut_partiel'),
      Icone: Clock,
      style: {
        color: 'var(--status-suspendu)',
        backgroundColor: 'var(--status-suspendu-bg)',
      },
    },
    paye: {
      label: t('paiements:statut_paye'),
      Icone: CheckCircle,
      style: {
        color: 'var(--status-encours)',
        backgroundColor: 'var(--status-encours-bg)',
      },
    },
  };
}

export type StatutKey = 'non_paye' | 'partiel' | 'paye';
export type FiltreModeType = ModePaiement | 'tous';

// ─── Schémas Zod ──────────────────────────────────────────────────────────────

export function creerSchemaPaiement(t: TFunction) {
  return z.object({
    dossierId: z.string().min(1, t('paiements:validation.dossier_requis')),
    honoraireId: z.string().min(1, t('paiements:validation.honoraire_requis')),
    montant: z
      .number({ invalid_type_error: t('paiements:validation.montant_invalide') })
      .positive(t('paiements:validation.montant_positif')),
    mode: z.enum(['cash', 'virement', 'ccp'] as const),
    date: z.string().min(1, t('paiements:validation.date_requise')),
    reference: z.string().optional(),
    note: z.string().optional(),
  });
}

export function modifierSchemaPaiement(t: TFunction) {
  return z.object({
    montant: z
      .number({ invalid_type_error: t('paiements:validation.montant_invalide') })
      .positive(t('paiements:validation.montant_positif')),
    mode: z.enum(['cash', 'virement', 'ccp'] as const),
    date: z.string().min(1, t('paiements:validation.date_requise')),
    reference: z.string().optional(),
    note: z.string().optional(),
  });
}

export type FormCreer = z.infer<ReturnType<typeof creerSchemaPaiement>>;
export type FormModifier = z.infer<ReturnType<typeof modifierSchemaPaiement>>;

export type DossierSelectorItem = {
  _id: string;
  reference: string;
  titre: string;
};
