import { z } from 'zod';

// Schéma de création d'une facture
export const creerFactureSchema = z.object({
  clientId: z
    .string({ required_error: 'Le client est obligatoire' })
    .min(1, 'clientId ne peut pas être vide'),
  dossierId: z
    .string({ required_error: 'Le dossier est obligatoire' })
    .min(1, 'dossierId ne peut pas être vide'),
  montant: z
    .number({ required_error: 'Le montant est obligatoire' })
    .positive({ message: 'Le montant doit être positif' }),
  dateEmission: z
    .string()
    .datetime({ message: 'Format de date invalide (ISO 8601 attendu)' })
    .optional(),
});

// Schéma de modification — seul le statut et le montant sont modifiables
export const modifierFactureSchema = z.object({
  montant: z.number().positive({ message: 'Le montant doit être positif' }).optional(),
  statut: z
    .enum(['brouillon', 'emise', 'payee'], {
      invalid_type_error: 'Statut invalide — valeurs : brouillon, emise, payee',
    })
    .optional(),
});

// NOUVEAU : Schéma de création d'une facture depuis un paiement
export const creerFactureDepuisPaiementSchema = z.object({
  paiementId: z
    .string({ required_error: "L'identifiant du paiement est obligatoire" })
    .min(1, "L'identifiant du paiement ne peut pas être vide"),
});

export type CreerFactureInput = z.infer<typeof creerFactureSchema>;
export type ModifierFactureInput = z.infer<typeof modifierFactureSchema>;
export type CreerFactureDepuisPaiementInput = z.infer<typeof creerFactureDepuisPaiementSchema>;










// import { z } from 'zod';

// // Schéma de création d'une facture
// export const creerFactureSchema = z.object({
//   clientId: z
//     .string({ required_error: 'Le client est obligatoire' })
//     .min(1, 'clientId ne peut pas être vide'),
//   dossierId: z
//     .string({ required_error: 'Le dossier est obligatoire' })
//     .min(1, 'dossierId ne peut pas être vide'),
//   montant: z
//     .number({ required_error: 'Le montant est obligatoire' })
//     .positive({ message: 'Le montant doit être positif' }),
//   dateEmission: z
//     .string()
//     .datetime({ message: 'Format de date invalide (ISO 8601 attendu)' })
//     .optional(),
// });

// // Schéma de modification — seul le statut et le montant sont modifiables
// export const modifierFactureSchema = z.object({
//   montant: z.number().positive({ message: 'Le montant doit être positif' }).optional(),
//   statut: z
//     .enum(['brouillon', 'emise', 'payee'], {
//       invalid_type_error: 'Statut invalide — valeurs : brouillon, emise, payee',
//     })
//     .optional(),
// });

// export type CreerFactureInput = z.infer<typeof creerFactureSchema>;
// export type ModifierFactureInput = z.infer<typeof modifierFactureSchema>;
