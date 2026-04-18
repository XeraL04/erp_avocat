import { z } from 'zod';


export const qualitePartieEnum = z.enum([
  'demandeur',
  'defendeur',
  'demandeur_pourvoi',
  'defendeur_pourvoi',
  'demandeur_renvoi',
  'defendeur_renvoi',
]);

export const institutionEnum = z.enum([
  'tribunal',
  'cour',
  'cour_supreme',
  'tribunal_administratif',
  'cour_appel_administrative',
  'conseil_etat',
]);

export const typeAffaireEnum = z.enum([
  'civil',
  'penal',
  'administratif',
]);

export const specialiteEnum = z.enum([
  // civil
  'civil',
  'foncier',
  'affaires_familiales',
  'sociale',
  'commerciale',
  'refere',
  // pénal
  'contraventions',
  'delits',
  'crimes',
  // administratif
  'ordinaire',
  'refere_administratif',
]);


// ─── Report ───────────────────────────────────────────────────────────────────

export const reportSchema = z.object({
  date:     z.string({ required_error: 'La date du report est obligatoire' }),
  raison:   z
    .string({ required_error: 'La raison est obligatoire' })
    .min(2, 'La raison doit contenir au moins 2 caractères')
    .trim(),
  jugement: z.string().trim().optional(),
});


// ─── Créer dossier ────────────────────────────────────────────────────────────

export const creerDossierSchema = z.object({
  clientId: z
    .string({ required_error: "L'identifiant du client est obligatoire" })
    .min(1),
  qualiteClient:     qualitePartieEnum,
  adversaire: z
    .string({ required_error: "Le nom de l'adversaire est obligatoire" })
    .min(2, "Le nom de l'adversaire doit contenir au moins 2 caractères")
    .trim(),
  qualiteAdversaire: qualitePartieEnum,

  dossierNumero:  z.string().trim().optional(),
  institution:    institutionEnum.optional(),
  nomInstitution: z.string().trim().max(200).optional(),
  typeAffaire:    typeAffaireEnum.optional(),
  specialite:     specialiteEnum.optional(),

  dateOuverture: z.string().optional(),
  description:   z.string().trim().optional(),

  reports: z.array(reportSchema).optional(),
});


// ─── Modifier dossier ─────────────────────────────────────────────────────────

export const modifierDossierSchema = z.object({
  qualiteClient:     qualitePartieEnum.optional(),
  adversaire:        z.string().trim().min(2).optional(),
  qualiteAdversaire: qualitePartieEnum.optional(),
  dossierNumero:     z.string().trim().optional(),
  institution:       institutionEnum.optional(),
  nomInstitution:    z.string().trim().max(200).nullable().optional(),
  typeAffaire:       typeAffaireEnum.optional(),
  specialite:        specialiteEnum.optional(),
  dateOuverture:     z.string().optional(),
  dateCloture:       z.string().nullable().optional(),
  description:       z.string().trim().nullable().optional(),
  reports:           z.array(reportSchema).optional(),
});


// ─── Ajouter / Modifier un report ─────────────────────────────────────────────

export const ajouterReportSchema = reportSchema;

export type CreerDossierInput    = z.infer<typeof creerDossierSchema>;
export type ModifierDossierInput = z.infer<typeof modifierDossierSchema>;
export type ReportInput          = z.infer<typeof reportSchema>;