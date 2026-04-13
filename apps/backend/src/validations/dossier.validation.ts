import { z } from 'zod';

// ─── Création de dossier ───────────────────────────────────────────────────────
export const creerDossierSchema = z.object({
  titre: z
    .string()
    .min(2, 'Le titre doit contenir au moins 2 caractères')
    .max(200, 'Titre trop long'),

  // ObjectId MongoDB du client — validé en DB dans le contrôleur
  client: z.string().min(1, 'Le client est requis'),

  type: z.enum(['civil', 'penal', 'commercial', 'administratif', 'autre'], {
    errorMap: () => ({
      message: 'Type invalide : civil | penal | commercial | administratif | autre',
    }),
  }),

  description: z.string().max(2000, 'Description trop longue').optional(),

  // Si absent, le contrôleur utilisera new Date()
  dateOuverture: z.coerce.date().optional(),
});

// ─── Modification de dossier (référence et client immuables) ───────────────────
export const modifierDossierSchema = z
  .object({
    titre: z.string().min(2).max(200).optional(),
    type: z.enum(['civil', 'penal', 'commercial', 'administratif', 'autre']).optional(),
    description: z.string().max(2000).nullable().optional(),
    dateOuverture: z.coerce.date().optional(),
    dateCloture: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Au moins un champ doit être fourni pour la modification',
  });

// ─── Changement de statut ──────────────────────────────────────────────────────
export const changerStatutSchema = z.object({
  statut: z.enum(['en_cours', 'suspendu', 'cloture'], {
    errorMap: () => ({ message: 'Statut invalide : en_cours | suspendu | cloture' }),
  }),
  // Optionnel : forcer une date de clôture précise (sinon = now)
  dateCloture: z.coerce.date().optional(),
});

// ─── Recherche et pagination ───────────────────────────────────────────────────
export const rechercheDossierSchema = z.object({
  // Recherche textuelle sur titre + reference via index $text MongoDB
  q: z.string().max(200).optional(),

  // Filtres
  statut: z.enum(['en_cours', 'suspendu', 'cloture']).optional(),
  type: z.enum(['civil', 'penal', 'commercial', 'administratif', 'autre']).optional(),
  client: z.string().optional(), // clientId pour filtrer par client

  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Types inférés ─────────────────────────────────────────────────────────────
export type CreerDossierInput = z.infer<typeof creerDossierSchema>;
export type ModifierDossierInput = z.infer<typeof modifierDossierSchema>;
export type ChangerStatutInput = z.infer<typeof changerStatutSchema>;
export type RechercheDossierInput = z.infer<typeof rechercheDossierSchema>;
