import { z } from 'zod';

// ─── Helper normalisation téléphone ───────────────────────────────────────────
// "0550 00 00 00" | "+213-550.00.00.00" → "0550000000" | "+21355000000"
const normaliserTelephone = (val: string) => val.replace(/[\s\-\.]+/g, '').trim();

const telephoneSchema = z
  .string()
  .min(1, 'Téléphone requis')
  .transform(normaliserTelephone)
  .pipe(
    z
      .string()
      .min(9, 'Le numéro de téléphone doit contenir au moins 9 chiffres')
      .max(20, 'Numéro de téléphone trop long')
      .regex(/^[0-9+]+$/, 'Format de téléphone invalide')
  );

const telephoneOptionnelSchema = z
  .string()
  .max(20)
  .transform(normaliserTelephone)
  .pipe(
    z
      .string()
      .max(20)
      .regex(/^[0-9+]+$/, 'Format de téléphone invalide')
  )
  .optional();

// ─── Champs communs aux deux types de clients ──────────────────────────────────
const champsCommuns = {
  // Téléphone OBLIGATOIRE — contrainte métier algérienne #1
  telephone: z
    .string()
    .min(9, 'Le numéro de téléphone doit contenir au moins 9 chiffres')
    .max(20, 'Numéro de téléphone trop long')
    .regex(/^[0-9\s\+\-\.]+$/, 'Format de téléphone invalide'),

  telephoneSecondaire: z
    .string()
    .max(20)
    .regex(/^[0-9\s\+\-\.]+$/, 'Format de téléphone invalide')
    .optional(),

  email: z.string().email('Adresse email invalide').max(200).optional().or(z.literal('')),

  adresse: z.string().max(500, "L'adresse ne doit pas dépasser 500 caractères").optional(),
  notes: z.string().max(1000, 'Les notes ne doivent pas dépasser 1000 caractères').optional(),
};

// ─── Schéma de création — union discriminée sur le type ───────────────────────
export const creerClientSchema = z.discriminatedUnion('type', [
  // Personne physique
  z.object({
    type: z.literal('physique'),
    nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100, 'Nom trop long'),
    prenom: z
      .string()
      .min(2, 'Le prénom doit contenir au moins 2 caractères')
      .max(100, 'Prénom trop long'),
    cin: z.string().max(20, 'CIN invalide').optional(),
    ...champsCommuns,
  }),

  // Personne morale (entreprise, association...)
  z.object({
    type: z.literal('morale'),
    raisonSociale: z
      .string()
      .min(2, 'La raison sociale doit contenir au moins 2 caractères')
      .max(200, 'Raison sociale trop longue'),
    representantLegal: z.string().max(200, 'Nom du représentant trop long').optional(),
    nifRc: z.string().max(50, 'NIF/RC invalide').optional(),
    ...champsCommuns,
  }),
]);

// ─── Schéma de modification — le type est immuable après création ──────────────
// On accepte tous les champs optionnels sans discriminatedUnion car le type ne change pas
export const modifierClientSchema = z
  .object({
    // Champs personne physique
    nom: z.string().min(2).max(100).optional(),
    prenom: z.string().min(2).max(100).optional(),
    cin: z.string().max(20).nullable().optional(),

    // Champs personne morale
    raisonSociale: z.string().min(2).max(200).optional(),
    representantLegal: z.string().max(200).nullable().optional(),
    nifRc: z.string().max(50).nullable().optional(),

    // Champs communs
    telephone: z
      .string()
      .min(9)
      .max(20)
      .regex(/^[0-9\s\+\-\.]+$/, 'Format de téléphone invalide')
      .optional(),
    telephoneSecondaire: z
      .string()
      .max(20)
      .regex(/^[0-9\s\+\-\.]+$/)
      .nullable()
      .optional(),
    email: z.string().email('Email invalide').nullable().optional(),
    adresse: z.string().max(500).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Au moins un champ doit être fourni pour la modification',
  });

// ─── Schéma de recherche / pagination ─────────────────────────────────────────
export const rechercheClientSchema = z.object({
  // q = recherche textuelle sur nom/prénom/raisonSociale (index MongoDB $text)
  q: z.string().max(200).optional(),

  // telephone = correspondance partielle (regex)
  telephone: z.string().max(20).optional(),

  // Filtre sur le type de client
  type: z.enum(['physique', 'morale']).optional(),

  // Pagination — z.coerce convertit automatiquement les query strings en number
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Types inférés pour usage dans le contrôleur ──────────────────────────────
export type CreerClientInput = z.infer<typeof creerClientSchema>;
export type ModifierClientInput = z.infer<typeof modifierClientSchema>;
export type RechercheClientInput = z.infer<typeof rechercheClientSchema>;
