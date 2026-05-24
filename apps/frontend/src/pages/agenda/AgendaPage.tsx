import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isToday, isTomorrow, isThisWeek, isPast, isFuture, parseISO } from 'date-fns';
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
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { EmptyState } from '@/components/ui/empty-state';

import {
  listerTousEvenements,
  creerEvenement,
  modifierEvenement,
  supprimerEvenement,
  type Evenement,
  type TypeEvenement,
} from '@/api/evenement.api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

// ─── Schéma ───────────────────────────────────────────────────────────────────

const schema = z.object({
  titre: z.string().trim().min(2),
  type: z.enum(['audience', 'rdv', 'rappel'], { required_error: 'required' }),
  dateHeure: z.string().min(1),
  lieu: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Config types ─────────────────────────────────────────────────────────────

interface TypeConfig {
  icone: React.ElementType;
  text: string;
  bg: string;
  border: string;
  dot: string;
}

const TYPE_CONFIG: Record<TypeEvenement, TypeConfig> = {
  audience: {
    icone: Scale,
    text: 'text-mode-virement',
    bg: 'bg-mode-virement-bg',
    border: 'border-mode-virement/30',
    dot: 'bg-mode-virement',
  },
  rdv: {
    icone: Users,
    text: 'text-status-actif',
    bg: 'bg-status-actif-bg',
    border: 'border-status-actif/30',
    dot: 'bg-status-actif',
  },
  rappel: {
    icone: Bell,
    text: 'text-status-suspendu',
    bg: 'bg-status-suspendu-bg',
    border: 'border-status-suspendu-border',
    dot: 'bg-status-suspendu',
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

type FiltrePeriode = 'a_venir' | 'aujourd_hui' | 'cette_semaine' | 'tous';
type FiltreType = TypeEvenement | 'tous';

function appliquerFiltres(
  evenements: Evenement[],
  periode: FiltrePeriode,
  type: FiltreType
): Evenement[] {
  let liste = type !== 'tous' ? evenements.filter((e) => e.type === type) : [...evenements];
  if (periode === 'a_venir')
    liste = liste.filter((e) => isFuture(parseISO(e.dateHeure)) || isToday(parseISO(e.dateHeure)));
  else if (periode === 'aujourd_hui') liste = liste.filter((e) => isToday(parseISO(e.dateHeure)));
  else if (periode === 'cette_semaine')
    liste = liste.filter((e) => isThisWeek(parseISO(e.dateHeure), { locale: fr }));
  return liste.sort((a, b) => parseISO(a.dateHeure).getTime() - parseISO(b.dateHeure).getTime());
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AgendaPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.utilisateur?.role);
  const peutModifier = role === 'admin' || role === 'assistant';
  const peutSupprimer = role === 'admin';

  const { t, i18n } = useTranslation('agenda');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';
  const locale = estRTL ? ar : fr;

  const [filtrePeriode, setFiltrePeriode] = useState<FiltrePeriode>('a_venir');
  const [filtreType, setFiltreType] = useState<FiltreType>('tous');
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [evenementEdite, setEvenementEdite] = useState<Evenement | null>(null);
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null);

  // ── Helpers de date localisés ──────────────────────────────────────────────

  const etiquetteDate = (dateHeure: string): string => {
    const d = parseISO(dateHeure);
    if (isToday(d)) return t('today');
    if (isTomorrow(d)) return t('tomorrow');
    if (isThisWeek(d, { locale })) return format(d, 'EEEE', { locale });
    return format(d, 'd MMMM yyyy', { locale });
  };

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['evenements', 'global'],
    queryFn: () => listerTousEvenements({ limit: 500 }),
  });

  const tousEvenements = data?.evenements ?? [];
  const evenements = appliquerFiltres(tousEvenements, filtrePeriode, filtreType);
  const groupes = grouperParJour(evenements);
  const nbAujourdhui = tousEvenements.filter((e) => isToday(parseISO(e.dateHeure))).length;
  const filtresActifs = filtrePeriode !== 'a_venir' || filtreType !== 'tous';

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

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ['evenements'] });

  const mutCreer = useMutation({
    mutationFn: (v: FormValues) =>
      creerEvenement({
        titre: v.titre,
        type: v.type,
        dateHeure: datetimeLocalToISO(v.dateHeure),
        lieu: v.lieu || undefined,
        notes: v.notes || undefined,
      }),
    onSuccess: () => {
      invalidate();
      fermerDialog();
      toast.success(t('event_added'));
    },
    onError: () => toast.error(t('event_add_error')),
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
      toast.success(t('event_updated'));
    },
    onError: () => toast.error(tc('error')),
  });

  const mutSupprimer = useMutation({
    mutationFn: (id: string) => supprimerEvenement(id),
    onSuccess: () => {
      invalidate();
      toast.success(t('event_deleted'));
    },
    onError: () => toast.error(tc('error')),
  });

  const onSubmit = (v: FormValues) => (evenementEdite ? mutModifier.mutate(v) : mutCreer.mutate(v));
  const isPending = mutCreer.isPending || mutModifier.isPending;

  const Opt = () => <span className="font-normal text-muted-foreground/70">({t('optional')})</span>;

  // ─────────────────────────────────────────────────────────────────────────

  // Labels types traduits — réactifs au changement de langue
  const labelType: Record<TypeEvenement, string> = {
    audience: t('type_audience'),
    rdv: t('type_rdv'),
    rappel: t('type_rappel'),
  };

  return (
    <div className="space-y-5">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {tousEvenements.length}{' '}
            {tousEvenements.length > 1 ? t('events_plural') : t('event_singular')}
            {nbAujourdhui > 0 && (
              <span className="inline-flex items-center rounded-full bg-mode-virement-bg px-2 py-0.5 text-xs font-medium text-mode-virement">
                {nbAujourdhui} {t('today')}
              </span>
            )}
          </p>
        </div>
        {peutModifier && (
          <Button size="sm" onClick={ouvrirCreation}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('schedule')}
          </Button>
        )}
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={filtrePeriode} onValueChange={(v) => setFiltrePeriode(v as FiltrePeriode)}>
          <SelectTrigger className="h-9 w-full text-sm sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a_venir">{t('filter_upcoming')}</SelectItem>
            <SelectItem value="aujourd_hui">{t('filter_today')}</SelectItem>
            <SelectItem value="cette_semaine">{t('filter_this_week')}</SelectItem>
            <SelectItem value="tous">{t('filter_all')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtreType} onValueChange={(v) => setFiltreType(v as FiltreType)}>
          <SelectTrigger className="h-9 w-full text-sm sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">{t('all_types')}</SelectItem>
            <SelectItem value="audience">{t('type_audience_plural')}</SelectItem>
            <SelectItem value="rdv">{t('type_rdv_plural')}</SelectItem>
            <SelectItem value="rappel">{t('type_rappel_plural')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Skeleton ── */}
      {isLoading && (
        <div className="space-y-5">
          {[...Array(2)].map((_, g) => (
            <div key={g}>
              <div className="mb-2 flex items-center gap-2">
                <Skeleton className="h-3 w-24" />
                <div className="flex-1 border-t" />
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="space-y-2">
                {[...Array(g === 0 ? 3 : 2)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                    <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-48" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && evenements.length === 0 && (
        <EmptyState
          icone={CalendarX}
          titre={filtrePeriode === 'a_venir' ? t('no_upcoming') : t('no_events')}
          description={filtrePeriode === 'a_venir' ? t('no_upcoming_desc') : t('no_events_desc')}
          action={
            peutModifier && !filtresActifs
              ? { label: t('schedule_event'), onClick: ouvrirCreation, icone: Plus }
              : undefined
          }
        />
      )}

      {/* ── Liste groupée par jour ── */}
      {!isLoading && evenements.length > 0 && (
        <div className="space-y-5">
          {[...groupes.entries()].map(([cle, items]) => (
            <div key={cle}>
              {/* Séparateur jour */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {etiquetteDate(items[0].dateHeure)}
                </span>
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length > 1 ? t('events_short_plural') : t('events_short')}
                </span>
              </div>

              {/* Cartes */}
              <div className="space-y-1.5">
                {items.map((evt) => {
                  const cfg = TYPE_CONFIG[evt.type];
                  const Icone = cfg.icone;
                  const passe =
                    isPast(parseISO(evt.dateHeure)) && !isToday(parseISO(evt.dateHeure));

                  return (
                    <div
                      key={evt.id}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                        passe ? 'bg-muted/30 opacity-60' : 'bg-card hover:bg-accent/30'
                      )}
                    >
                      {/* Icône type */}
                      <div className="mt-0.5 shrink-0">
                        <Icone className={cn('h-3.5 w-3.5', cfg.text)} aria-hidden="true" />
                      </div>

                      {/* Contenu */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium leading-tight">{evt.titre}</span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-xs font-medium',
                              cfg.text,
                              cfg.bg,
                              cfg.border
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                            {labelType[evt.type]}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="font-medium">
                            {format(parseISO(evt.dateHeure), "HH'h'mm", { locale })}
                          </span>
                          {evt.lieu && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {evt.lieu}
                            </span>
                          )}
                          {evt.dossier && (
                            <Link
                              to={`/cabinet/dossiers/${evt.dossier.id}`}
                              className="flex items-center gap-1 transition-colors hover:text-foreground"
                            >
                              <FolderOpen className="h-3 w-3" aria-hidden="true" />
                              <span className="font-mono">{evt.dossier.reference}</span>
                            </Link>
                          )}
                          {evt.notes && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" aria-hidden="true" />
                              <span className="max-w-44 truncate">{evt.notes}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-0.5">
                        {peutModifier && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`${tc('edit')} ${evt.titre}`}
                            onClick={() => ouvrirEdition(evt)}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        )}
                        {peutSupprimer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            aria-label={`${tc('delete')} ${evt.titre}`}
                            onClick={() => setIdASupprimer(evt.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Dialog Créer / Modifier ── */}
      <Dialog open={dialogOuvert} onOpenChange={(o) => !o && fermerDialog()}>
        <DialogContent className="gap-0 p-0 sm:max-w-md" dir={estRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-base">
              {evenementEdite ? t('edit_event') : t('new_event')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {evenementEdite ? `${t('editing')} « ${evenementEdite.titre} »` : t('new_event_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Titre */}
                <FormField
                  control={form.control}
                  name="titre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        {t('form_title')} <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-9 text-sm"
                          placeholder={t('form_title_placeholder')}
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
                          {t('form_type')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue placeholder={t('form_type')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="audience">{t('type_audience')}</SelectItem>
                            <SelectItem value="rdv">{t('type_rdv')}</SelectItem>
                            <SelectItem value="rappel">{t('type_rappel')}</SelectItem>
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
                          {t('form_datetime')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" className="h-9 text-sm" {...field} />
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
                        {t('form_location')} <Opt />
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-9 text-sm"
                          placeholder={t('form_location_placeholder')}
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
                        {t('form_notes')} <Opt />
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="resize-none text-sm"
                          rows={2}
                          placeholder={t('form_notes_placeholder')}
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
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    )}
                    {evenementEdite ? tc('save') : t('add_button')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Alert suppression ── */}
      <AlertDialog open={!!idASupprimer} onOpenChange={(o) => !o && setIdASupprimer(null)}>
        <AlertDialogContent dir={estRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('delete_warning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (idASupprimer) mutSupprimer.mutate(idASupprimer);
                setIdASupprimer(null);
              }}
            >
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
