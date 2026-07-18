import { useState, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isToday, isTomorrow, isThisWeek, isPast, parseISO } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import {
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  FileText,
  Scale,
  Users,
  Bell,
  Loader2,
  CalendarX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

import {
  listerEvenementsDossier,
  creerEvenement,
  modifierEvenement,
  supprimerEvenement,
  type Evenement,
  type TypeEvenement,
} from '@/api/evenement.api';

// ─── Schéma ───────────────────────────────────────────────────────────────────
// Les messages d'erreur Zod sont gérés via i18next-zod ou overridés dans FormMessage
const schema = z.object({
  titre: z.string().trim().min(2),
  type: z.enum(['audience', 'rdv', 'rappel']),
  dateHeure: z.string().min(1),
  lieu: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Config type (CSS seulement, labels via i18n) ─────────────────────────────
const TYPE_CONFIG: Record<
  TypeEvenement,
  {
    icone: React.ElementType;
    dot: string;
    ring: string;
    card: string;
  }
> = {
  audience: {
    icone: Scale,
    dot: 'bg-kpi-dossiers',
    ring: 'bg-kpi-dossiers/30',
    card: 'bg-kpi-dossiers-bg',
  },
  rdv: {
    icone: Users,
    dot: 'bg-status-encours',
    ring: 'bg-status-encours/30',
    card: 'bg-status-encours-bg',
  },
  rappel: {
    icone: Bell,
    dot: 'bg-kpi-audiences',
    ring: 'bg-kpi-audiences/30',
    card: 'bg-kpi-audiences-bg',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoToDatetimeLocal(iso: string): string {
  const d = parseISO(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToISO(local: string): string {
  return new Date(local).toISOString();
}

function grouperParJour(evenements: Evenement[]): Map<string, Evenement[]> {
  const map = new Map<string, Evenement[]>();
  for (const e of evenements) {
    const cle = format(parseISO(e.dateHeure), 'yyyy-MM-dd');
    if (!map.has(cle)) map.set(cle, []);
    map.get(cle)!.push(e);
  }
  return map;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function TabAgenda({ dossierId }: Props) {
  const qc = useQueryClient();
  const uid = useId();

  const { t, i18n } = useTranslation('agenda');
  const { t: tc } = useTranslation('common');

  // Locale date-fns selon la langue active
  const dateFnsLocale = i18n.language === 'ar' ? ar : fr;

  const role = useAuthStore((s) => s.utilisateur?.role);
  const peutModifier = role === 'admin' || role === 'assistant';
  const peutSupprimer = role === 'admin';

  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [evenementEdite, setEvenementEdite] = useState<Evenement | null>(null);
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: evenements = [], isLoading } = useQuery({
    queryKey: ['evenements', dossierId],
    queryFn: () => listerEvenementsDossier(dossierId),
  });

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '', type: 'audience', dateHeure: '', lieu: '', notes: '' },
  });

  const ouvrirCreation = () => {
    setEvenementEdite(null);
    form.reset({ titre: '', type: 'audience', dateHeure: '', lieu: '', notes: '' });
    setDialogOuvert(true);
  };

  const ouvrirEdition = (e: Evenement) => {
    setEvenementEdite(e);
    form.reset({
      titre: e.titre,
      type: e.type,
      dateHeure: isoToDatetimeLocal(e.dateHeure),
      lieu: e.lieu ?? '',
      notes: e.notes ?? '',
    });
    setDialogOuvert(true);
  };

  const fermerDialog = () => {
    setDialogOuvert(false);
    setEvenementEdite(null);
    form.reset();
  };

  // ── Helpers i18n date ──────────────────────────────────────────────────────
  function etiquetteDate(dateHeure: string): { label: string; estAujourdhui: boolean } {
    const d = parseISO(dateHeure);
    if (isToday(d)) return { label: t('aujourdhui'), estAujourdhui: true };
    if (isTomorrow(d)) return { label: t('demain'), estAujourdhui: false };
    if (isThisWeek(d, { locale: dateFnsLocale }))
      return { label: format(d, 'EEEE', { locale: dateFnsLocale }), estAujourdhui: false };
    return { label: format(d, 'd MMMM yyyy', { locale: dateFnsLocale }), estAujourdhui: false };
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['evenements', dossierId] });

  const mutCreer = useMutation({
    mutationFn: (v: FormValues) =>
      creerEvenement({
        titre: v.titre,
        type: v.type,
        dateHeure: datetimeLocalToISO(v.dateHeure),
        lieu: v.lieu || undefined,
        notes: v.notes || undefined,
        dossierId,
      }),
    onSuccess: () => {
      invalidate();
      fermerDialog();
      toast.success(t('evenement_ajoute'));
    },
    onError: () => toast.error(t('erreur_ajout')),
  });

  const mutModifier = useMutation({
    mutationFn: (v: FormValues) =>
      modifierEvenement(evenementEdite!.id, {
        titre: v.titre,
        type: v.type,
        dateHeure: datetimeLocalToISO(v.dateHeure),
        lieu: v.lieu || undefined,
        notes: v.notes || undefined,
      }),
    onSuccess: () => {
      invalidate();
      fermerDialog();
      toast.success(t('evenement_modifie'));
    },
    onError: () => toast.error(t('erreur_modification')),
  });

  const mutSupprimer = useMutation({
    mutationFn: (id: string) => supprimerEvenement(id),
    onSuccess: () => {
      invalidate();
      toast.success(t('evenement_supprime'));
    },
    onError: () => toast.error(tc('erreur_suppression')),
  });

  const onSubmit = (v: FormValues) => (evenementEdite ? mutModifier.mutate(v) : mutCreer.mutate(v));
  const isPending = mutCreer.isPending || mutModifier.isPending;
  const groupes = grouperParJour(evenements);

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('nb_evenements', { count: evenements.length })}</span>
        </div>
        {peutModifier && (
          <Button size="sm" onClick={ouvrirCreation}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {tc('ajouter')}
          </Button>
        )}
      </div>

      {/* ── Skeleton ────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <Skeleton className="mt-0.5 h-4 w-4 rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3.5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!isLoading && evenements.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CalendarX className="h-8 w-8 text-muted-foreground/25" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t('aucun_evenement')}</p>
          {peutModifier && (
            <Button variant="outline" size="sm" onClick={ouvrirCreation}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t('planifier_cta')}
            </Button>
          )}
        </div>
      )}

      {/* ── Timeline groupée par jour ───────────────────────────── */}
      {!isLoading && evenements.length > 0 && (
        <div className="space-y-5">
          {[...groupes.entries()].map(([cle, items]) => {
            const { label, estAujourdhui } = etiquetteDate(items[0].dateHeure);

            return (
              <div key={cle}>
                {/* Séparateur jour */}
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide',
                      estAujourdhui ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                  <div className="flex-1 border-t" aria-hidden="true" />
                  {estAujourdhui && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t('aujourdhui')}
                    </span>
                  )}
                </div>

                {/* Événements du jour */}
                <div className="relative space-y-1.5 pl-5">
                  {items.length > 1 && (
                    <span
                      className="absolute left-1.75 top-2.5 h-[calc(100%-1.25rem)] w-px bg-border/60"
                      aria-hidden="true"
                    />
                  )}

                  {items.map((evt) => {
                    const cfg = TYPE_CONFIG[evt.type];
                    const Icone = cfg.icone;
                    const passe = isPast(parseISO(evt.dateHeure));

                    return (
                      <div key={evt.id} className="relative flex items-start gap-3">
                        {/* Dot */}
                        <span
                          className={cn(
                            'relative z-10 mt-2.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ring-2 ring-background',
                            passe ? 'bg-muted-foreground/30' : cfg.dot
                          )}
                          aria-hidden="true"
                        />

                        {/* Card */}
                        <div
                          className={cn(
                            'group flex min-w-0 flex-1 items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                            passe
                              ? 'border-border/50 bg-muted/20 opacity-55'
                              : `border-border/60 ${cfg.card} hover:brightness-[0.97] dark:hover:brightness-110`
                          )}
                        >
                          <div className="mt-0.5 shrink-0">
                            <Icone
                              className={cn(
                                'h-3.5 w-3.5',
                                passe ? 'text-muted-foreground/50' : 'text-muted-foreground'
                              )}
                              aria-hidden="true"
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium leading-tight">{evt.titre}</span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    passe ? 'bg-muted-foreground/30' : cfg.dot
                                  )}
                                  aria-hidden="true"
                                />
                                {t(`type_${evt.type}`)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="tabular-nums font-medium">
                                {format(parseISO(evt.dateHeure), "HH'h'mm", {
                                  locale: dateFnsLocale,
                                })}
                              </span>
                              {evt.lieu && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" aria-hidden="true" />
                                  {evt.lieu}
                                </span>
                              )}
                              {evt.notes && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" aria-hidden="true" />
                                  <span className="max-w-48 truncate">{evt.notes}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            {peutModifier && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => ouvrirEdition(evt)}
                                aria-label={t('modifier_evenement', { titre: evt.titre })}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            )}
                            {peutSupprimer && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setIdASupprimer(evt.id)}
                                aria-label={t('supprimer_evenement', { titre: evt.titre })}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialog Créer / Modifier ──────────────────────────────── */}
      <Dialog open={dialogOuvert} onOpenChange={(o) => !o && !isPending && fermerDialog()}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-base">
              {evenementEdite ? t('dialog_modifier_titre') : t('dialog_creer_titre')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {evenementEdite
                ? t('dialog_modifier_desc', { titre: evenementEdite.titre })
                : t('dialog_creer_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5">
            <Form {...form}>
              <form
                id={`${uid}-form`}
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                {/* Titre */}
                <FormField
                  control={form.control}
                  name="titre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        {t('champ_titre')} <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-9 text-sm"
                          placeholder={t('placeholder_titre')}
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Type + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {tc('type')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue placeholder={tc('type')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.keys(TYPE_CONFIG) as TypeEvenement[]).map((val) => (
                              <SelectItem key={val} value={val}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className={cn('h-1.5 w-1.5 rounded-full', TYPE_CONFIG[val].dot)}
                                    aria-hidden="true"
                                  />
                                  {t(`type_${val}`)}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateHeure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {t('champ_date_heure')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="h-9 text-sm"
                            disabled={isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Lieu */}
                <FormField
                  control={form.control}
                  name="lieu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        {t('champ_lieu')}{' '}
                        <span className="font-normal text-muted-foreground/70">({tc('opt')})</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-9 text-sm"
                          placeholder={t('placeholder_lieu')}
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        {t('champ_notes')}{' '}
                        <span className="font-normal text-muted-foreground/70">({tc('opt')})</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="resize-none text-sm"
                          rows={2}
                          placeholder={t('placeholder_notes')}
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fermerDialog}
                    disabled={isPending}
                  >
                    {tc('cancel')}
                  </Button>
                  <Button type="submit" size="sm" form={`${uid}-form`} disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    )}
                    {isPending
                      ? evenementEdite
                        ? tc('enregistrement_en_cours')
                        : tc('ajout_en_cours')
                      : evenementEdite
                        ? tc('enregistrer')
                        : tc('ajouter')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Alert suppression ───────────────────────────────────── */}
      <AlertDialog open={!!idASupprimer} onOpenChange={(o) => !o && setIdASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmer_supprimer_titre')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmer_supprimer_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('annuler')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => {
                  if (idASupprimer) mutSupprimer.mutate(idASupprimer);
                  setIdASupprimer(null);
                }}
              >
                {tc('supprimer')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
