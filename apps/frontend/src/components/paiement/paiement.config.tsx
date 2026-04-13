import { Banknote, CreditCard, Wallet, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import type { ModePaiement } from '@/api/paiement.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formaterMontant(montant: number): string {
  return new Intl.NumberFormat('fr-DZ').format(montant) + ' DA';
}

// ─── Configs visuelles ────────────────────────────────────────────────────────

export const CONFIG_MODE: Record<
  ModePaiement,
  { label: string; icone: React.ReactNode; badge: string }
> = {
  cash: {
    label: 'Espèces',
    icone: <Banknote className="h-3.5 w-3.5" />,
    badge: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  },
  virement: {
    label: 'Virement',
    icone: <CreditCard className="h-3.5 w-3.5" />,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  },
  ccp: {
    label: 'CCP',
    icone: <Wallet className="h-3.5 w-3.5" />,
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  },
};

export const CONFIG_STATUT = {
  non_paye: {
    label: 'Non réglé',
    icone: <AlertCircle className="h-3.5 w-3.5" />,
    cls: 'text-destructive bg-destructive/10',
  },
  partiel: {
    label: 'Partiel',
    icone: <Clock className="h-3.5 w-3.5" />,
    cls: 'text-orange-600 bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400',
  },
  paye: {
    label: 'Réglé',
    icone: <CheckCircle className="h-3.5 w-3.5" />,
    cls: 'text-green-600 bg-green-100 dark:bg-green-950/30 dark:text-green-400',
  },
} as const;

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
  montant: z.number({ invalid_type_error: 'Montant invalide' }).positive().optional(),
  mode: z.enum(['cash', 'virement', 'ccp'] as const),
  date: z.string().min(1),
  reference: z.string().optional(),
  note: z.string().optional(),
});
export type FormModifier = z.infer<typeof schemaModifier>;

// Type local pour l'autocomplete dossier (MongoDB retourne _id avec lean())
export type DossierSelectorItem = { _id: string; reference: string; titre: string };
