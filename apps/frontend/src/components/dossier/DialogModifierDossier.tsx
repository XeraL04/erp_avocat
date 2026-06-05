import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { modifierDossier, ajouterReport, supprimerReport } from '@/api/dossier.api';
import type {
  Dossier,
  QualitePartie,
  TypeAffaire,
  SpecialiteDossier,
  InstitutionDossier,
} from '@/types';
import {
  LABELS_QUALITE,
  LABELS_TYPE_AFFAIRE,
  SPECIALITES_PAR_TYPE,
  LABELS_INSTITUTION,
  GROUPES_INSTITUTION,
} from '@/types';
import InputInstitution from '@/components/dossier/InputInstitution';

// ─── Schéma Zod ───────────────────────────────────────────────────────────────
const qualiteEnum = z.enum([
  'demandeur',
  'defendeur',
  'demandeur_pourvoi',
  'defendeur_pourvoi',
  'demandeur_renvoi',
  'defendeur_renvoi',
]);

const reportSchema = z.object({
  _id: z.string().optional(),
  date: z.string().min(1),
  raison: z.string().min(2).trim(),
  jugement: z.string().optional(),
});

const schemaModifierDossier = z.object({
  qualiteClient: qualiteEnum,
  adversaire: z.string().min(2).trim(),
  qualiteAdversaire: qualiteEnum,
  dossierNumero: z.string().optional(),
  institution: z.string().optional(),
  nomInstitution: z.string().optional(),
  typeAffaire: z.string().optional(),
  specialite: z.string().optional(),
  dateOuverture: z.string().optional(),
  description: z.string().max(2000).optional(),
  reports: z.array(reportSchema).optional(),
});
type FormModifierDossier = z.infer<typeof schemaModifierDossier>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  dossier: Dossier;
  onFermer: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function DialogModifierDossier({ dossier, onFermer }: Props) {
  const queryClient = useQueryClient();

  const { t } = useTranslation('dossiers');
  const { t: tc } = useTranslation('common');

  const form = useForm<FormModifierDossier>({
    resolver: zodResolver(schemaModifierDossier),
    defaultValues: buildDefaultValues(dossier),
  });

  const {
    formState: { isDirty },
  } = form;

  const {
    fields: reportFields,
    append: appendReport,
    remove: removeReport,
  } = useFieldArray({ control: form.control, name: 'reports' });

  useEffect(() => {
    form.reset(buildDefaultValues(dossier));
  }, [dossier, form]);

  const typeAffaireSelectionne = form.watch('typeAffaire');
  const optionsSpecialite =
    typeAffaireSelectionne && typeAffaireSelectionne !== '_none' && typeAffaireSelectionne !== ''
      ? (SPECIALITES_PAR_TYPE[typeAffaireSelectionne as TypeAffaire] ?? [])
      : [];

  // ─── Mutation ──────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormModifierDossier) => {
      const dossierMaj = await modifierDossier(dossier._id, {
        qualiteClient: data.qualiteClient as QualitePartie,
        adversaire: data.adversaire,
        qualiteAdversaire: data.qualiteAdversaire as QualitePartie,
        dossierNumero: data.dossierNumero || undefined,
        institution: (data.institution === '_none' ? undefined : data.institution) as
          | InstitutionDossier
          | undefined,
        nomInstitution: data.nomInstitution?.trim() || null,
        typeAffaire: (data.typeAffaire === '_none' ? undefined : data.typeAffaire) as
          | TypeAffaire
          | undefined,
        specialite: (data.specialite === '_none' ? undefined : data.specialite) as
          | SpecialiteDossier
          | undefined,
        dateOuverture: data.dateOuverture || undefined,
        description: data.description || null,
      });

      const reportsFormulaire = data.reports ?? [];
      const reportsOriginaux = dossier.reports ?? [];

      const idsFormulaire = new Set(reportsFormulaire.map((r) => r._id).filter(Boolean));
      const aSupprimer = reportsOriginaux.filter((r) => !idsFormulaire.has(r._id));
      await Promise.all(aSupprimer.map((r) => supprimerReport(dossier._id, r._id)));

      const aAjouter = reportsFormulaire.filter((r) => !r._id);
      await Promise.all(
        aAjouter.map((r) =>
          ajouterReport(dossier._id, {
            date: `${r.date}T00:00:00.000Z`,
            raison: r.raison,
            jugement: r.jugement || undefined,
          })
        )
      );

      return dossierMaj;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossier', dossier._id] });
      toast.success(t('dossier_modifie'));
      onFermer();
    },
    onError: () => toast.error(t('erreur_modification')),
  });

  // ─── Sous-composants locaux ────────────────────────────────────────────────
  const Opt = () => <span className="font-normal text-muted-foreground/70">({tc('opt')})</span>;

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* ── Header ──────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="text-base">{t('modifier_dossier')}</DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {dossier.reference}
          </DialogDescription>
        </DialogHeader>

        {/* ── Body scrollable ─────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form
              id="form-modifier-dossier"
              onSubmit={form.handleSubmit((data) => mutate(data))}
              className="space-y-7"
              noValidate
            >
              {/* ══ Parties ══════════════════════════════════════ */}
              <section className="space-y-3">
                <SectionTitle>{t('section_parties')}</SectionTitle>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Qualité du client — pleine largeur */}
                  <FormField
                    control={form.control}
                    name="qualiteClient"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-xs font-medium">
                          {t('qualite_client')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.entries(LABELS_QUALITE) as [QualitePartie, string][]).map(
                              ([val, label]) => (
                                <SelectItem key={val} value={val}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Séparateur */}
                  <div className="sm:col-span-2 border-t border-dashed border-border/60" />

                  {/* Adversaire — col 1 */}
                  <FormField
                    control={form.control}
                    name="adversaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {t('adversaire')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-9 w-full text-sm"
                            placeholder={t('adversaire_placeholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Qualité adversaire — col 2 */}
                  <FormField
                    control={form.control}
                    name="qualiteAdversaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {t('qualite_adversaire')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.entries(LABELS_QUALITE) as [QualitePartie, string][]).map(
                              ([val, label]) => (
                                <SelectItem key={val} value={val}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* ══ Identification judiciaire ════════════════════ */}
              <section className="space-y-3">
                <SectionTitle>{t('section_identification')}</SectionTitle>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Dossier n° */}
                  <FormField
                    control={form.control}
                    name="dossierNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {t('dossier_numero')} <Opt />
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-9 w-full text-sm"
                            placeholder={t('dossier_numero_placeholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Date d'ouverture */}
                  <FormField
                    control={form.control}
                    name="dateOuverture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {t('date_ouverture')} <Opt />
                        </FormLabel>
                        <FormControl>
                          <Input type="date" className="h-9 w-full text-sm" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Institution */}
                  <FormField
                    control={form.control}
                    name="institution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {t('institution')} <Opt />
                        </FormLabel>
                        <Select
                          value={field.value || '_none'}
                          onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue placeholder={tc('selectionner')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">{t('aucune_institution')}</SelectItem>
                            {GROUPES_INSTITUTION.map((groupe) => (
                              <SelectGroup key={groupe.label}>
                                <SelectLabel>{groupe.label}</SelectLabel>
                                {groupe.options.map((val) => (
                                  <SelectItem key={val} value={val}>
                                    {LABELS_INSTITUTION[val]}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Nom institution */}
                  <FormField
                    control={form.control}
                    name="nomInstitution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {t('nom_institution')} <Opt />
                        </FormLabel>
                        <FormControl>
                          <InputInstitution value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Type d'affaire */}
                  <FormField
                    control={form.control}
                    name="typeAffaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {t('type_affaire')} <Opt />
                        </FormLabel>
                        <Select
                          value={field.value || '_none'}
                          onValueChange={(v) => {
                            field.onChange(v === '_none' ? '' : v);
                            form.setValue('specialite', '', { shouldDirty: true });
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue placeholder={tc('selectionner')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">{t('aucun_type')}</SelectItem>
                            {(Object.entries(LABELS_TYPE_AFFAIRE) as [TypeAffaire, string][]).map(
                              ([val, label]) => (
                                <SelectItem key={val} value={val}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Spécialité */}
                  <FormField
                    control={form.control}
                    name="specialite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {t('specialite')} <Opt />
                        </FormLabel>
                        <Select
                          value={field.value || '_none'}
                          onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                          disabled={
                            !typeAffaireSelectionne ||
                            typeAffaireSelectionne === '_none' ||
                            typeAffaireSelectionne === ''
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue
                                placeholder={
                                  typeAffaireSelectionne && typeAffaireSelectionne !== '_none'
                                    ? tc('selectionner')
                                    : t('choisir_type_dabord')
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">{t('aucune_specialite')}</SelectItem>
                            {optionsSpecialite.map(({ valeur, label }) => (
                              <SelectItem key={valeur} value={valeur}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* ══ Description ══════════════════════════════════ */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">
                      {tc('description')} <Opt />
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder={t('description_placeholder')}
                        className="w-full resize-none text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* ══ Reports d'audience ═══════════════════════════ */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>{t('section_reports')}</SectionTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => appendReport({ date: '', raison: '', jugement: '' })}
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    {tc('ajouter')}
                  </Button>
                </div>

                {reportFields.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/60 py-5 text-center">
                    <p className="text-xs text-muted-foreground">{t('aucun_report')}</p>
                  </div>
                )}

                <div className="space-y-2.5">
                  {reportFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="group rounded-lg border border-border/60 bg-muted/20 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {t('report_numero', { numero: index + 1 })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          aria-label={t('supprimer_report', { numero: index + 1 })}
                          onClick={() => removeReport(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`reports.${index}.date`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">
                                {tc('date')} <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input type="date" className="h-9 w-full text-sm" {...f} />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`reports.${index}.raison`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">
                                {t('report_raison')} <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 w-full text-sm"
                                  placeholder={t('report_raison_placeholder')}
                                  {...f}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`reports.${index}.jugement`}
                          render={({ field: f }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-xs font-medium">
                                {t('report_jugement')} <Opt />
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9 w-full text-sm"
                                  placeholder={t('report_jugement_placeholder')}
                                  {...f}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </form>
          </Form>
        </div>

        {/* ── Footer fixe ─────────────────────────────────────── */}
        <div className="shrink-0 border-t bg-muted/20 px-6 py-3">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs text-muted-foreground transition-opacity ${
                isDirty ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {t('modifications_non_enregistrees')}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onFermer}
                disabled={isPending}
              >
                {tc('annuler')}
              </Button>
              <Button
                type="submit"
                size="sm"
                form="form-modifier-dossier"
                disabled={isPending || !isDirty}
              >
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                {isPending ? tc('enregistrement_en_cours') : tc('enregistrer')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildDefaultValues(dossier: Dossier): FormModifierDossier {
  return {
    qualiteClient: dossier.qualiteClient,
    adversaire: dossier.adversaire,
    qualiteAdversaire: dossier.qualiteAdversaire,
    dossierNumero: dossier.dossierNumero ?? '',
    institution: dossier.institution ?? '_none',
    nomInstitution: dossier.nomInstitution ?? '',
    typeAffaire: dossier.typeAffaire ?? '_none',
    specialite: dossier.specialite ?? '_none',
    dateOuverture: dossier.dateOuverture
      ? new Date(dossier.dateOuverture).toISOString().split('T')[0]
      : '',
    description: dossier.description ?? '',
    reports: (dossier.reports ?? []).map((r) => ({
      _id: r._id,
      date: new Date(r.date).toISOString().split('T')[0],
      raison: r.raison,
      jugement: r.jugement ?? '',
    })),
  };
}
