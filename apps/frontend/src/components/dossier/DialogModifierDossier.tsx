import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { Separator } from '@/components/ui/separator';

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
  // LABELS_SPECIALITE,
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
  date: z.string().min(1, 'Date requise'),
  raison: z.string().min(2, 'Raison requise (min 2 car.)').trim(),
  jugement: z.string().optional(),
});

const schemaModifierDossier = z.object({
  qualiteClient: qualiteEnum,
  adversaire: z.string().min(2, "Nom de l'adversaire requis (min 2 car.)").trim(),
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

  // Resync si le dossier change
  useEffect(() => {
    form.reset(buildDefaultValues(dossier));
  }, [dossier, form]);

  // typeAffaire observé pour filtrer les spécialités
  const typeAffaireSelectionne = form.watch('typeAffaire'); // string | undefined — pas de cast
  const optionsSpecialite =
    typeAffaireSelectionne && typeAffaireSelectionne !== '_none' && typeAffaireSelectionne !== ''
      ? (SPECIALITES_PAR_TYPE[typeAffaireSelectionne as TypeAffaire] ?? [])
      : [];

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormModifierDossier) => {
      // 1. Modifier les champs du dossier (sans reports)
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

      // 2. Reports supprimés
      const idsFormulaire = new Set(reportsFormulaire.map((r) => r._id).filter(Boolean));
      const aSupprimer = reportsOriginaux.filter((r) => !idsFormulaire.has(r._id));

      await Promise.all(aSupprimer.map((r) => supprimerReport(dossier._id, r._id)));

      // 3. Reports ajoutés
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
      toast.success('Dossier modifié avec succès');
      onFermer();
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* ── Header fixe ── */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Modifier le dossier</DialogTitle>
          <DialogDescription className="font-mono">{dossier.reference}</DialogDescription>
        </DialogHeader>

        {/* ── Body scrollable ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form
              id="form-modifier-dossier"
              onSubmit={form.handleSubmit((data) => mutate(data))}
              className="space-y-6"
            >
              {/* ── Parties ──────────────────────────────────────────────── */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Parties
                </h3>

                {/* Qualité du client */}
                <FormField
                  control={form.control}
                  name="qualiteClient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualité du client *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Adversaire */}
                <FormField
                  control={form.control}
                  name="adversaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contre (adversaire) *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom complet ou raison sociale" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Qualité de l'adversaire */}
                <FormField
                  control={form.control}
                  name="qualiteAdversaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualité de l'adversaire *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Identification judiciaire ─────────────────────────────── */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Identification judiciaire
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* N° dossier */}
                  <FormField
                    control={form.control}
                    name="dossierNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Dossier n°{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex : 2024/1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date d'ouverture */}
                  <FormField
                    control={form.control}
                    name="dateOuverture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Date d'ouverture{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Institution */}
                  <FormField
                    control={form.control}
                    name="institution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Institution{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <Select
                          value={field.value || '_none'}
                          onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner l'institution" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">— Aucune —</SelectItem>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nomInstitution"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Quelle institution{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <FormControl>
                          <InputInstitution value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Type d'affaire */}
                  <FormField
                    control={form.control}
                    name="typeAffaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Type d'affaire{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <Select
                          value={field.value || '_none'}
                          onValueChange={(v) => {
                            field.onChange(v === '_none' ? '' : v);
                            // Réinitialise la spécialité quand le type change
                            form.setValue('specialite', '', { shouldDirty: true });
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">— Aucun —</SelectItem>
                            {(Object.entries(LABELS_TYPE_AFFAIRE) as [TypeAffaire, string][]).map(
                              ([val, label]) => (
                                <SelectItem key={val} value={val}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Spécialité — dépend du type d'affaire */}
                  <FormField
                    control={form.control}
                    name="specialite"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Spécialité{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
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
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  typeAffaireSelectionne && typeAffaireSelectionne !== '_none'
                                    ? 'Sélectionner la spécialité'
                                    : "Choisir d'abord un type d'affaire"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">— Aucune —</SelectItem>
                            {optionsSpecialite.map(({ valeur, label }) => (
                              <SelectItem key={valeur} value={valeur}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Description ──────────────────────────────────────────── */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="font-normal text-muted-foreground">(opt.)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Contexte de l'affaire, faits importants…"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Reports d'audience ────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Reports d'audience
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendReport({ date: '', raison: '', jugement: '' })}
                  >
                    <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Ajouter un report
                  </Button>
                </div>

                {reportFields.length === 0 && (
                  <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
                    Aucun report enregistré.
                  </p>
                )}

                <div className="space-y-3">
                  {reportFields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Report #{index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label={`Supprimer le report #${index + 1}`}
                          onClick={() => removeReport(index)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`reports.${index}.date`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`reports.${index}.raison`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Raison</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex : Absence de l'avocat adverse" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`reports.${index}.jugement`}
                          render={({ field: f }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>
                                Jugement{' '}
                                <span className="font-normal text-muted-foreground">(opt.)</span>
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="Ex : Renvoi au 15/06/2026" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* ── Footer fixe ── */}
        <div className="shrink-0 border-t px-6 py-4">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" form="form-modifier-dossier" disabled={isPending || !isDirty}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
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
