import { z } from 'zod';

// Schéma de création d'un paiement
export const creerPaiementSchema = z.object({
  honoraireId: z
    .string({ required_error: "L'identifiant de l'honoraire est obligatoire" })
    .min(1, "L'identifiant de l'honoraire ne peut pas être vide"),
  dossierId: z
    .string({ required_error: "L'identifiant du dossier est obligatoire" })
    .min(1, "L'identifiant du dossier ne peut pas être vide"),
  montant: z
    .number({ required_error: 'Le montant est obligatoire' })
    .positive({ message: 'Le montant doit être positif' }),
  date: z
    .string({ required_error: 'La date du paiement est obligatoire' })
    .datetime({ message: 'Format de date invalide (ISO 8601 attendu)' })
    .or(z.date()),
  mode: z.enum(['cash', 'virement', 'ccp'], {
    required_error: 'Le mode de paiement est obligatoire',
    invalid_type_error: 'Mode invalide — valeurs acceptées : cash, virement, ccp',
  }),
  reference: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

// Schéma de modification (montant et date non modifiables après création)
export const modifierPaiementSchema = z.object({
  montant: z.number().positive({ message: 'Le montant doit être positif' }).optional(),
  date: z
    .string()
    .datetime({ message: 'Format de date invalide (ISO 8601 attendu)' })
    .or(z.date())
    .optional(),
  mode: z
    .enum(['cash', 'virement', 'ccp'], {
      invalid_type_error: 'Mode invalide — valeurs acceptées : cash, virement, ccp',
    })
    .optional(),
  reference: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type CreerPaiementInput = z.infer<typeof creerPaiementSchema>;
export type ModifierPaiementInput = z.infer<typeof modifierPaiementSchema>;
