import { useState, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import {
  CheckCircle2,
  Circle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ListChecks,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

import {
  listerEtapesDossier,
  creerEtape,
  modifierEtape,
  supprimerEtape,
  type Etape,
} from '@/api/etape.api';

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z.object({
  nom: z.string().trim().min(2),
  date: z.string().min(1),
  statut: z.enum(['termine', 'enattente']),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}
function dateInputToISO(d: string): string {
  return `${d}T00:00:00.000Z`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function TabEtapes({ dossierId }: Props) {
  const qc = useQueryClient();
  const uid = useId();

  const { t, i18n } = useTranslation('etapes');
  const { t: tc } = useTranslation('common');

  const dateFnsLocale = i18n.language === 'ar' ? ar : fr;

  const role = useAuthStore((s) => s.utilisateur?.role);
  const peutModifier = role === 'admin' || role === 'assistant';
  const peutSupprimer = role === 'admin';

  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [etapeEditee, setEtapeEditee] = useState<Etape | null>(null);
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: etapes = [], isLoading } = useQuery({
    queryKey: ['etapes', dossierId],
    queryFn: () => listerEtapesDossier(dossierId),
  });

  const nbTerminees = etapes.filter((e) => e.statut === 'termine').length;
  const nbTotal = etapes.length;
  const progression = nbTotal > 0 ? Math.round((nbTerminees / nbTotal) * 100) : 0;

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nom: '', date: '', statut: 'enattente', notes: '' },
  });

  const ouvrirCreation = () => {
    setEtapeEditee(null);
    form.reset({ nom: '', date: '', statut: 'enattente', notes: '' });
    setDialogOuvert(true);
  };

  const ouvrirEdition = (e: Etape) => {
    setEtapeEditee(e);
    form.reset({
      nom: e.nom,
      date: isoToDateInput(e.date),
      statut: e.statut,
      notes: e.notes ?? '',
    });
    setDialogOuvert(true);
  };

  const fermerDialog = () => {
    setDialogOuvert(false);
    setEtapeEditee(null);
    form.reset();
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['etapes', dossierId] });

  const mutCreer = useMutation({
    mutationFn: (v: FormValues) =>
      creerEtape(dossierId, {
        nom: v.nom,
        date: dateInputToISO(v.date),
        statut: v.statut,
        notes: v.notes || undefined,
      }),
    onSuccess: () => {
      invalidate();
      fermerDialog();
      toast.success(t('etape_ajoutee'));
    },
    onError: () => toast.error(t('erreur_ajout')),
  });

  const mutModifier = useMutation({
    mutationFn: (v: FormValues) =>
      modifierEtape(etapeEditee!.id, {
        nom: v.nom,
        date: dateInputToISO(v.date),
        statut: v.statut,
        notes: v.notes || undefined,
      }),
    onSuccess: () => {
      invalidate();
      fermerDialog();
      toast.success(t('etape_modifiee'));
    },
    onError: () => toast.error(t('erreur_modification')),
  });

  const mutBasculer = useMutation({
    mutationFn: (etape: Etape) =>
      modifierEtape(etape.id, {
        statut: etape.statut === 'termine' ? 'enattente' : 'termine',
      }),
    onSuccess: () => invalidate(),
    onError: () => toast.error(t('erreur_bascule_statut')),
  });

  const mutSupprimer = useMutation({
    mutationFn: (id: string) => supprimerEtape(id),
    onSuccess: () => {
      invalidate();
      toast.success(t('etape_supprimee'));
    },
    onError: () => toast.error(t('erreur_suppression')),
  });

  const onSubmit = (v: FormValues) => (etapeEditee ? mutModifier.mutate(v) : mutCreer.mutate(v));
  const isPending = mutCreer.isPending || mutModifier.isPending;

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── En-tête + progression ───────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('nb_etapes', { terminées: nbTerminees, total: nbTotal })}</span>
          </div>
          {nbTotal > 0 && (
            <div
              className="flex min-w-28 items-center gap-2"
              role="progressbar"
              aria-valuenow={progression}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('progression_aria', { pct: progression })}
            >
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    progression === 100 ? 'bg-status-encours' : 'bg-primary'
                  )}
                  style={{ width: `${progression}%` }}
                />
              </div>
              <span className="w-8 shrink-0 tabular-nums text-xs text-muted-foreground">
                {progression}%
              </span>
            </div>
          )}
        </div>
        {peutModifier && (
          <Button size="sm" onClick={ouvrirCreation} className="shrink-0">
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {tc('ajouter')}
          </Button>
        )}
      </div>

      {/* ── Skeleton ────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative flex gap-3">
              <Skeleton className="relative z-10 mt-2 h-5 w-5 shrink-0 rounded-full" />
              <div className="flex-1 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3.5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!isLoading && etapes.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <ListChecks className="h-8 w-8 text-muted-foreground/25" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t('aucune_etape')}</p>
          {peutModifier && (
            <Button variant="outline" size="sm" onClick={ouvrirCreation}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t('premiere_etape_cta')}
            </Button>
          )}
        </div>
      )}

      {/* ── Timeline ────────────────────────────────────────────── */}
      {!isLoading && etapes.length > 0 && (
        <div className="relative">
          <div className="absolute bottom-2 left-2.25 top-2 w-px bg-border/60" aria-hidden="true" />
          <div className="space-y-2">
            {etapes.map((etape, index) => {
              const estTerminee = etape.statut === 'termine';
              const labelBascule = peutModifier
                ? estTerminee
                  ? t('marquer_en_attente')
                  : t('marquer_terminee')
                : undefined;

              return (
                <div key={etape.id ?? index} className="relative flex gap-3">
                  {/* Dot bascule */}
                  <button
                    type="button"
                    onClick={() => peutModifier && mutBasculer.mutate(etape)}
                    disabled={!peutModifier || mutBasculer.isPending}
                    aria-label={labelBascule ?? t('statut_aria', { nom: etape.nom })}
                    aria-pressed={estTerminee}
                    className={cn(
                      'relative z-10 mt-2 shrink-0 rounded-full transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      peutModifier ? 'cursor-pointer' : 'cursor-default',
                      estTerminee
                        ? 'text-status-encours hover:text-status-encours/70'
                        : 'text-muted-foreground/40 hover:text-muted-foreground'
                    )}
                  >
                    {estTerminee ? (
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>

                  {/* Card */}
                  <div
                    className={cn(
                      'group flex-1 rounded-lg border px-3 py-2.5 transition-colors',
                      estTerminee
                        ? 'border-border/40 bg-muted/20 opacity-60'
                        : 'border-border/60 bg-card hover:bg-accent/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-medium leading-tight',
                              estTerminee && 'line-through text-muted-foreground'
                            )}
                          >
                            {etape.nom}
                          </span>
                          <span
                            className={cn(
                              'flex items-center gap-1 text-xs',
                              estTerminee ? 'text-status-encours' : 'text-muted-foreground'
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                estTerminee ? 'bg-status-encours' : 'bg-muted-foreground/40'
                              )}
                              aria-hidden="true"
                            />
                            {estTerminee ? t('statut_termine') : t('statut_enattente')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                          <span className="tabular-nums">
                            {format(parseISO(etape.date), 'd MMMM yyyy', { locale: dateFnsLocale })}
                          </span>
                          {etape.notes && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span className="max-w-52 truncate">{etape.notes}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions au hover */}
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {peutModifier && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => ouvrirEdition(etape)}
                            aria-label={t('modifier_etape', { nom: etape.nom })}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        )}
                        {peutSupprimer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setIdASupprimer(etape.id)}
                            aria-label={t('supprimer_etape', { nom: etape.nom })}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Dialog Créer / Modifier ──────────────────────────────── */}
      <Dialog open={dialogOuvert} onOpenChange={(o) => !o && !isPending && fermerDialog()}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="text-base">
              {etapeEditee ? t('dialog_modifier_titre') : t('dialog_creer_titre')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {etapeEditee
                ? t('dialog_modifier_desc', { nom: etapeEditee.nom })
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
                {/* Nom */}
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        {t('champ_nom')} <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-9 text-sm"
                          placeholder={t('placeholder_nom')}
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Date + Statut */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {tc('date')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="h-9 text-sm"
                            disabled={isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="statut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {tc('statut')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="enattente">
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                                  aria-hidden="true"
                                />
                                {t('statut_enattente')}
                              </span>
                            </SelectItem>
                            <SelectItem value="termine">
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-status-encours"
                                  aria-hidden="true"
                                />
                                {t('statut_termine')}
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

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
                    {tc('annuler')}
                  </Button>
                  <Button type="submit" size="sm" form={`${uid}-form`} disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    )}
                    {isPending
                      ? etapeEditee
                        ? tc('enregistrement_en_cours')
                        : tc('ajout_en_cours')
                      : etapeEditee
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

// import { useState, useId } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { format, parseISO } from 'date-fns';
// import { fr } from 'date-fns/locale';
// import {
//   CheckCircle2,
//   Circle,
//   Plus,
//   Pencil,
//   Trash2,
//   Loader2,
//   ListChecks,
//   FileText,
// } from 'lucide-react';
// import { toast } from 'sonner';

// import { Button } from '@/components/ui/button';
// import { Skeleton } from '@/components/ui/skeleton';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from '@/components/ui/dialog';
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from '@/components/ui/alert-dialog';
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from '@/components/ui/form';
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { useAuthStore } from '@/stores/auth.store';
// import { cn } from '@/lib/utils';

// import {
//   listerEtapesDossier,
//   creerEtape,
//   modifierEtape,
//   supprimerEtape,
//   type Etape,
// } from '@/api/etape.api';

// // ─── Schéma ───────────────────────────────────────────────────────────────────

// const schema = z.object({
//   nom: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères'),
//   date: z.string().min(1, 'La date est obligatoire'),
//   statut: z.enum(['termine', 'enattente']),
//   notes: z.string().trim().optional(),
// });
// type FormValues = z.infer<typeof schema>;

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function isoToDateInput(iso: string): string {
//   return iso.slice(0, 10);
// }
// function dateInputToISO(d: string): string {
//   return `${d}T00:00:00.000Z`;
// }

// // ─── Composant ────────────────────────────────────────────────────────────────

// interface Props {
//   dossierId: string;
// }

// export default function TabEtapes({ dossierId }: Props) {
//   const qc = useQueryClient();
//   const uid = useId();

//   const role = useAuthStore((s) => s.utilisateur?.role);
//   const peutModifier = role === 'admin' || role === 'assistant';
//   const peutSupprimer = role === 'admin';

//   const [dialogOuvert, setDialogOuvert] = useState(false);
//   const [etapeEditee, setEtapeEditee] = useState<Etape | null>(null);
//   const [idASupprimer, setIdASupprimer] = useState<string | null>(null);

//   // ── Query ──────────────────────────────────────────────────────────────────

//   const { data: etapes = [], isLoading } = useQuery({
//     queryKey: ['etapes', dossierId],
//     queryFn: () => listerEtapesDossier(dossierId),
//   });

//   const nbTerminees = etapes.filter((e) => e.statut === 'termine').length;
//   const nbTotal = etapes.length;
//   const progression = nbTotal > 0 ? Math.round((nbTerminees / nbTotal) * 100) : 0;

//   // ── Formulaire ─────────────────────────────────────────────────────────────

//   const form = useForm<FormValues>({
//     resolver: zodResolver(schema),
//     defaultValues: { nom: '', date: '', statut: 'enattente', notes: '' },
//   });

//   const ouvrirCreation = () => {
//     setEtapeEditee(null);
//     form.reset({ nom: '', date: '', statut: 'enattente', notes: '' });
//     setDialogOuvert(true);
//   };

//   const ouvrirEdition = (e: Etape) => {
//     setEtapeEditee(e);
//     form.reset({
//       nom: e.nom,
//       date: isoToDateInput(e.date),
//       statut: e.statut,
//       notes: e.notes ?? '',
//     });
//     setDialogOuvert(true);
//   };

//   const fermerDialog = () => {
//     setDialogOuvert(false);
//     setEtapeEditee(null);
//     form.reset();
//   };

//   // ── Mutations ──────────────────────────────────────────────────────────────

//   const invalidate = () => qc.invalidateQueries({ queryKey: ['etapes', dossierId] });

//   const mutCreer = useMutation({
//     mutationFn: (v: FormValues) =>
//       creerEtape(dossierId, {
//         nom: v.nom,
//         date: dateInputToISO(v.date),
//         statut: v.statut,
//         notes: v.notes || undefined,
//       }),
//     onSuccess: () => {
//       invalidate();
//       fermerDialog();
//       toast.success('Étape ajoutée');
//     },
//     onError: () => toast.error("Impossible d'ajouter l'étape"),
//   });

//   const mutModifier = useMutation({
//     mutationFn: (v: FormValues) =>
//       modifierEtape(etapeEditee!.id, {
//         nom: v.nom,
//         date: dateInputToISO(v.date),
//         statut: v.statut,
//         notes: v.notes || undefined,
//       }),
//     onSuccess: () => {
//       invalidate();
//       fermerDialog();
//       toast.success('Étape modifiée');
//     },
//     onError: () => toast.error('Impossible de modifier'),
//   });

//   const mutBasculer = useMutation({
//     mutationFn: (etape: Etape) =>
//       modifierEtape(etape.id, {
//         statut: etape.statut === 'termine' ? 'enattente' : 'termine',
//       }),
//     onSuccess: () => invalidate(),
//     onError: () => toast.error('Impossible de changer le statut'),
//   });

//   const mutSupprimer = useMutation({
//     mutationFn: (id: string) => supprimerEtape(id),
//     onSuccess: () => {
//       invalidate();
//       toast.success('Étape supprimée');
//     },
//     onError: () => toast.error('Impossible de supprimer'),
//   });

//   const onSubmit = (v: FormValues) => (etapeEditee ? mutModifier.mutate(v) : mutCreer.mutate(v));
//   const isPending = mutCreer.isPending || mutModifier.isPending;

//   // ── Rendu ──────────────────────────────────────────────────────────────────

//   return (
//     <div className="space-y-4">
//       {/* ── En-tête + progression ───────────────────────────────── */}
//       <div className="flex items-center justify-between gap-4">
//         <div className="flex min-w-0 items-center gap-3">
//           <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
//             <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
//             <span>
//               {nbTerminees}/{nbTotal} étape{nbTotal > 1 ? 's' : ''}
//             </span>
//           </div>
//           {nbTotal > 0 && (
//             <div
//               className="flex min-w-28 items-center gap-2"
//               role="progressbar"
//               aria-valuenow={progression}
//               aria-valuemin={0}
//               aria-valuemax={100}
//               aria-label={`Progression : ${progression}%`}
//             >
//               <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
//                 <div
//                   className={cn(
//                     'h-full rounded-full transition-all duration-500',
//                     progression === 100 ? 'bg-status-encours' : 'bg-primary'
//                   )}
//                   style={{ width: `${progression}%` }}
//                 />
//               </div>
//               <span className="w-8 shrink-0 tabular-nums text-xs text-muted-foreground">
//                 {progression}%
//               </span>
//             </div>
//           )}
//         </div>
//         {peutModifier && (
//           <Button size="sm" onClick={ouvrirCreation} className="shrink-0">
//             <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
//             Ajouter
//           </Button>
//         )}
//       </div>

//       {/* ── Skeleton ────────────────────────────────────────────── */}
//       {isLoading && (
//         <div className="space-y-2">
//           {Array.from({ length: 3 }).map((_, i) => (
//             <div key={i} className="relative flex gap-3">
//               <Skeleton className="relative z-10 mt-2 h-5 w-5 shrink-0 rounded-full" />
//               <div className="flex-1 rounded-lg border p-3">
//                 <div className="flex items-start justify-between gap-2">
//                   <div className="flex-1 space-y-1.5">
//                     <div className="flex items-center gap-2">
//                       <Skeleton className="h-3.5 w-36" />
//                       <Skeleton className="h-3.5 w-16 rounded-full" />
//                     </div>
//                     <Skeleton className="h-3 w-28" />
//                   </div>
//                   <div className="flex gap-1">
//                     <Skeleton className="h-7 w-7 rounded-md" />
//                     <Skeleton className="h-7 w-7 rounded-md" />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* ── Empty state ─────────────────────────────────────────── */}
//       {!isLoading && etapes.length === 0 && (
//         <div className="flex flex-col items-center gap-3 py-10 text-center">
//           <ListChecks className="h-8 w-8 text-muted-foreground/25" aria-hidden="true" />
//           <p className="text-sm text-muted-foreground">Aucune étape procédurale</p>
//           {peutModifier && (
//             <Button variant="outline" size="sm" onClick={ouvrirCreation}>
//               <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
//               Ajouter la première étape
//             </Button>
//           )}
//         </div>
//       )}

//       {/* ── Timeline ────────────────────────────────────────────── */}
//       {!isLoading && etapes.length > 0 && (
//         <div className="relative">
//           <div className="absolute bottom-2 left-2.25 top-2 w-px bg-border/60" aria-hidden="true" />
//           <div className="space-y-2">
//             {etapes.map((etape, index) => {
//               const estTerminee = etape.statut === 'termine';
//               const labelBascule = peutModifier
//                 ? estTerminee
//                   ? 'Marquer en attente'
//                   : 'Marquer comme terminée'
//                 : undefined;

//               return (
//                 <div key={etape.id ?? index} className="relative flex gap-3">
//                   {/* Dot bascule */}
//                   <button
//                     type="button"
//                     onClick={() => peutModifier && mutBasculer.mutate(etape)}
//                     disabled={!peutModifier || mutBasculer.isPending}
//                     aria-label={labelBascule ?? `Statut : ${etape.nom}`}
//                     aria-pressed={estTerminee}
//                     className={cn(
//                       'relative z-10 mt-2 shrink-0 rounded-full transition-colors',
//                       'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
//                       peutModifier ? 'cursor-pointer' : 'cursor-default',
//                       estTerminee
//                         ? 'text-status-encours hover:text-status-encours/70'
//                         : 'text-muted-foreground/40 hover:text-muted-foreground'
//                     )}
//                   >
//                     {estTerminee ? (
//                       <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
//                     ) : (
//                       <Circle className="h-5 w-5" aria-hidden="true" />
//                     )}
//                   </button>

//                   {/* Card */}
//                   <div
//                     className={cn(
//                       'group flex-1 rounded-lg border px-3 py-2.5 transition-colors',
//                       estTerminee
//                         ? 'border-border/40 bg-muted/20 opacity-60'
//                         : 'border-border/60 bg-card hover:bg-accent/30'
//                     )}
//                   >
//                     <div className="flex items-start justify-between gap-2">
//                       <div className="min-w-0 space-y-0.5">
//                         <div className="flex flex-wrap items-center gap-2">
//                           <span
//                             className={cn(
//                               'text-sm font-medium leading-tight',
//                               estTerminee && 'line-through text-muted-foreground'
//                             )}
//                           >
//                             {etape.nom}
//                           </span>
//                           <span
//                             className={cn(
//                               'flex items-center gap-1 text-xs',
//                               estTerminee ? 'text-status-encours' : 'text-muted-foreground'
//                             )}
//                           >
//                             <span
//                               className={cn(
//                                 'h-1.5 w-1.5 rounded-full',
//                                 estTerminee ? 'bg-status-encours' : 'bg-muted-foreground/40'
//                               )}
//                               aria-hidden="true"
//                             />
//                             {estTerminee ? 'Terminée' : 'En attente'}
//                           </span>
//                         </div>
//                         <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
//                           <span className="tabular-nums">
//                             {format(parseISO(etape.date), 'd MMMM yyyy', { locale: fr })}
//                           </span>
//                           {etape.notes && (
//                             <span className="flex items-center gap-1">
//                               <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
//                               <span className="max-w-52 truncate">{etape.notes}</span>
//                             </span>
//                           )}
//                         </div>
//                       </div>

//                       {/* Actions au hover */}
//                       <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
//                         {peutModifier && (
//                           <Button
//                             variant="ghost"
//                             size="icon"
//                             className="h-7 w-7 text-muted-foreground hover:text-foreground"
//                             onClick={() => ouvrirEdition(etape)}
//                             aria-label={`Modifier l'étape ${etape.nom}`}
//                           >
//                             <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
//                           </Button>
//                         )}
//                         {peutSupprimer && (
//                           <Button
//                             variant="ghost"
//                             size="icon"
//                             className="h-7 w-7 text-muted-foreground hover:text-destructive"
//                             onClick={() => setIdASupprimer(etape.id)}
//                             aria-label={`Supprimer l'étape ${etape.nom}`}
//                           >
//                             <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
//                           </Button>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       )}

//       {/* ── Dialog Créer / Modifier ──────────────────────────────── */}
//       <Dialog open={dialogOuvert} onOpenChange={(o) => !o && !isPending && fermerDialog()}>
//         <DialogContent className="gap-0 p-0 sm:max-w-md">
//           <DialogHeader className="border-b px-6 py-4">
//             <DialogTitle className="text-base">
//               {etapeEditee ? "Modifier l'étape" : 'Nouvelle étape'}
//             </DialogTitle>
//             <DialogDescription className="text-xs text-muted-foreground">
//               {etapeEditee
//                 ? `Modification de « ${etapeEditee.nom} »`
//                 : 'Ajoutez une étape procédurale à ce dossier.'}
//             </DialogDescription>
//           </DialogHeader>

//           <div className="px-6 py-5">
//             <Form {...form}>
//               <form
//                 id={`${uid}-form`}
//                 onSubmit={form.handleSubmit(onSubmit)}
//                 className="space-y-4"
//                 noValidate
//               >
//                 {/* Nom */}
//                 <FormField
//                   control={form.control}
//                   name="nom"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="text-xs font-medium">
//                         Nom de l'étape <span className="text-destructive">*</span>
//                       </FormLabel>
//                       <FormControl>
//                         <Input
//                           className="h-9 text-sm"
//                           placeholder="ex : Dépôt de la plainte"
//                           disabled={isPending}
//                           {...field}
//                         />
//                       </FormControl>
//                       <FormMessage className="text-xs" />
//                     </FormItem>
//                   )}
//                 />

//                 {/* Date + Statut */}
//                 <div className="grid grid-cols-2 gap-3">
//                   <FormField
//                     control={form.control}
//                     name="date"
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel className="text-xs font-medium">
//                           Date <span className="text-destructive">*</span>
//                         </FormLabel>
//                         <FormControl>
//                           <Input
//                             type="date"
//                             className="h-9 text-sm"
//                             disabled={isPending}
//                             {...field}
//                           />
//                         </FormControl>
//                         <FormMessage className="text-xs" />
//                       </FormItem>
//                     )}
//                   />
//                   <FormField
//                     control={form.control}
//                     name="statut"
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel className="text-xs font-medium">
//                           Statut <span className="text-destructive">*</span>
//                         </FormLabel>
//                         <Select
//                           value={field.value}
//                           onValueChange={field.onChange}
//                           disabled={isPending}
//                         >
//                           <FormControl>
//                             <SelectTrigger className="h-9 w-full text-sm">
//                               <SelectValue />
//                             </SelectTrigger>
//                           </FormControl>
//                           <SelectContent>
//                             <SelectItem value="enattente">
//                               <span className="flex items-center gap-2">
//                                 <span
//                                   className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
//                                   aria-hidden="true"
//                                 />
//                                 En attente
//                               </span>
//                             </SelectItem>
//                             <SelectItem value="termine">
//                               <span className="flex items-center gap-2">
//                                 <span
//                                   className="h-1.5 w-1.5 rounded-full bg-status-encours"
//                                   aria-hidden="true"
//                                 />
//                                 Terminée
//                               </span>
//                             </SelectItem>
//                           </SelectContent>
//                         </Select>
//                         <FormMessage className="text-xs" />
//                       </FormItem>
//                     )}
//                   />
//                 </div>

//                 {/* Notes */}
//                 <FormField
//                   control={form.control}
//                   name="notes"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="text-xs font-medium">
//                         Notes <span className="font-normal text-muted-foreground/70">(opt.)</span>
//                       </FormLabel>
//                       <FormControl>
//                         <Textarea
//                           className="resize-none text-sm"
//                           rows={2}
//                           placeholder="Informations complémentaires…"
//                           disabled={isPending}
//                           {...field}
//                         />
//                       </FormControl>
//                       <FormMessage className="text-xs" />
//                     </FormItem>
//                   )}
//                 />

//                 <DialogFooter className="pt-1">
//                   <Button
//                     type="button"
//                     variant="outline"
//                     size="sm"
//                     onClick={fermerDialog}
//                     disabled={isPending}
//                   >
//                     Annuler
//                   </Button>
//                   <Button type="submit" size="sm" form={`${uid}-form`} disabled={isPending}>
//                     {isPending && (
//                       <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
//                     )}
//                     {isPending
//                       ? etapeEditee
//                         ? 'Enregistrement…'
//                         : 'Ajout en cours…'
//                       : etapeEditee
//                         ? 'Enregistrer'
//                         : 'Ajouter'}
//                   </Button>
//                 </DialogFooter>
//               </form>
//             </Form>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* ── Alert suppression ───────────────────────────────────── */}
//       <AlertDialog open={!!idASupprimer} onOpenChange={(o) => !o && setIdASupprimer(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Supprimer cette étape ?</AlertDialogTitle>
//             <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Annuler</AlertDialogCancel>
//             <AlertDialogAction asChild>
//               <Button
//                 variant="destructive"
//                 onClick={() => {
//                   if (idASupprimer) mutSupprimer.mutate(idASupprimer);
//                   setIdASupprimer(null);
//                 }}
//               >
//                 Supprimer
//               </Button>
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }
