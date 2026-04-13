import { z } from 'zod';

export const creerEtapeSchema = z.object({
  nom: z
    .string({ required_error: "Le nom de l'étape est obligatoire" })
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères'),
  date: z
    .string({ required_error: 'La date est obligatoire' })
    .datetime({ message: 'Format invalide (ISO 8601 attendu)' }),
  statut: z
    .enum(['termine', 'enattente'], {
      invalid_type_error: 'Statut invalide — valeurs : termine, enattente',
    })
    .default('enattente'),
  notes: z.string().trim().optional(),
});

export const modifierEtapeSchema = creerEtapeSchema.partial();

export type CreerEtapeInput = z.infer<typeof creerEtapeSchema>;
export type ModifierEtapeInput = z.infer<typeof modifierEtapeSchema>;
