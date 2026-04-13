import { z } from 'zod';

export const creerDocumentSchema = z.object({
  nom: z
    .string({ required_error: 'Le nom du document est obligatoire' })
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères'),
  type: z.enum(['contrat', 'jugement', 'piece', 'autre'], {
    required_error: 'Le type de document est obligatoire',
    invalid_type_error: 'Type invalide — valeurs : contrat, jugement, piece, autre',
  }),
  dossierId: z
    .string({ required_error: 'Le dossier est obligatoire' })
    .min(1, 'dossierId ne peut pas être vide'),
  description: z.string().trim().optional(),
});

export type CreerDocumentInput = z.infer<typeof creerDocumentSchema>;
