import { z } from 'zod';

// Schéma de création d'un honoraire
export const creerHonoraireSchema = z.object({
  montantTotal: z
    .number({ required_error: 'Le montant total est obligatoire' })
    .positive({ message: 'Le montant total doit être positif' }),
  type: z.enum(['forfait', 'echelonne'], {
    required_error: "Le type d'honoraire est obligatoire",
    invalid_type_error: 'Type invalide — valeurs acceptées : forfait, echelonne',
  }),
  description: z.string().trim().optional(),
});

// Schéma de modification (tous les champs optionnels)
export const modifierHonoraireSchema = creerHonoraireSchema.partial();

export type CreerHonoraireInput = z.infer<typeof creerHonoraireSchema>;
export type ModifierHonoraireInput = z.infer<typeof modifierHonoraireSchema>;
