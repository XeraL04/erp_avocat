import { z } from 'zod';

export const creerEvenementSchema = z.object({
  titre: z
    .string({ required_error: 'Le titre est obligatoire' })
    .trim()
    .min(2, 'Le titre doit contenir au moins 2 caractères'),
  type: z.enum(['audience', 'rdv', 'rappel'], {
    required_error: "Le type d'événement est obligatoire",
    invalid_type_error: 'Type invalide — valeurs : audience, rdv, rappel',
  }),
  dateHeure: z
    .string({ required_error: 'La date et heure sont obligatoires' })
    .datetime({ message: 'Format invalide (ISO 8601 attendu)' }),
  lieu: z.string().trim().optional(),
  dossierId: z.string().optional(),
  notes: z.string().trim().optional(),
});

export const modifierEvenementSchema = creerEvenementSchema.partial();

export type CreerEvenementInput = z.infer<typeof creerEvenementSchema>;
export type ModifierEvenementInput = z.infer<typeof modifierEvenementSchema>;
