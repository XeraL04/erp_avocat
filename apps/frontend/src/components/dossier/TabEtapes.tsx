import { useState, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CheckCircle2,
  Circle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ListChecks,
  FileText,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

import {
  listerEtapesDossier,
  creerEtape,
  modifierEtape,
  supprimerEtape,
  type Etape,
} from '@/api/etape.api';

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z.object({
  nom: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères'),
  date: z.string().min(1, 'La date est obligatoire'),
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

// ─── Composant ────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
}

export default function TabEtapes({ dossierId }: Props) {
  const qc = useQueryClient();
  const uid = useId();

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

  // ── Stats progression ──────────────────────────────────────────────────────
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
      toast.success('Étape ajoutée');
    },
    onError: () => toast.error("Impossible d'ajouter l'étape"),
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
      toast.success('Étape modifiée');
    },
    onError: () => toast.error('Impossible de modifier'),
  });

  const mutBasculer = useMutation({
    mutationFn: (etape: Etape) =>
      modifierEtape(etape.id, {
        statut: etape.statut === 'termine' ? 'enattente' : 'termine',
      }),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Impossible de changer le statut'),
  });

  const mutSupprimer = useMutation({
    mutationFn: (id: string) => supprimerEtape(id),
    onSuccess: () => {
      invalidate();
      toast.success('Étape supprimée');
    },
    onError: () => toast.error('Impossible de supprimer'),
  });

  const onSubmit = (v: FormValues) => (etapeEditee ? mutModifier.mutate(v) : mutCreer.mutate(v));
  const isPending = mutCreer.isPending || mutModifier.isPending;

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* En-tête + barre de progression */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            <span>
              {nbTerminees}/{nbTotal} étape{nbTotal > 1 ? 's' : ''}
            </span>
          </div>
          {nbTotal > 0 && (
            <div
              className="flex min-w-30 items-center gap-2"
              role="progressbar"
              aria-valuenow={progression}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progression : ${progression}%`}
            >
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
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
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Ajouter
          </Button>
        )}
      </div>

      {/* Skeleton — miroir du layout réel */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative flex gap-3">
              <Skeleton className="relative z-10 mt-2 h-5 w-5 shrink-0 rounded-full" />
              <div className="flex-1 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-5 w-20 rounded-full" />
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

      {/* Empty state */}
      {!isLoading && etapes.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <ListChecks className="h-10 w-10 opacity-30" aria-hidden="true" />
          <p className="text-sm">Aucune étape procédurale</p>
          {peutModifier && (
            <Button variant="outline" size="sm" onClick={ouvrirCreation}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Ajouter la première étape
            </Button>
          )}
        </div>
      )}

      {/* Timeline */}
      {!isLoading && etapes.length > 0 && (
        <div className="relative">
          {/* Trait vertical */}
          <div className="absolute bottom-2 left-2.25 top-2 w-px bg-border" aria-hidden="true" />
          <div className="space-y-2">
            {etapes.map((etape, index) => {
              const estTerminee = etape.statut === 'termine';
              const labelBascule = peutModifier
                ? estTerminee
                  ? 'Marquer en attente'
                  : 'Marquer comme terminée'
                : undefined;

              return (
                <div key={etape.id ?? index} className="relative flex gap-3">
                  {/* Bouton bascule statut */}
                  <button
                    type="button"
                    onClick={() => peutModifier && mutBasculer.mutate(etape)}
                    disabled={!peutModifier || mutBasculer.isPending}
                    aria-label={labelBascule ?? `Statut de l'étape : ${etape.nom}`}
                    aria-pressed={estTerminee}
                    className={`relative z-10 mt-2 shrink-0 rounded-full transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                      focus-visible:ring-offset-2
                      ${peutModifier ? 'cursor-pointer' : 'cursor-default'}
                      ${
                        estTerminee
                          ? 'text-(--color-primary) hover:text-(--color-primary-hover)'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {estTerminee ? (
                      <CheckCircle2
                        className="h-5 w-5 fill-(--color-primary)/10"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>

                  {/* Carte étape */}
                  <div
                    className={`flex-1 rounded-lg border p-3 transition-colors ${
                      estTerminee ? 'bg-muted/30 opacity-75' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-medium leading-tight ${
                              estTerminee ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {etape.nom}
                          </span>

                          {/* Badge statut — tokens CSS uniquement */}
                          {estTerminee ? (
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-xs
                                border-primary/40
                                bg-primary/8
                                text-(--color-primary)"
                            >
                              Terminée
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-xs
                                border-(--color-warning)/40
                                bg-(--color-warning)/8
                                text-(--color-warning)"
                            >
                              En attente
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{format(parseISO(etape.date), 'd MMMM yyyy', { locale: fr })}</span>
                          {etape.notes && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span className="max-w-55 truncate">{etape.notes}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        {peutModifier && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => ouvrirEdition(etape)}
                            aria-label={`Modifier l'étape ${etape.nom}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        )}
                        {peutSupprimer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/5 hover:text-destructive"
                            onClick={() => setIdASupprimer(etape.id)}
                            aria-label={`Supprimer l'étape ${etape.nom}`}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{etapeEditee ? "Modifier l'étape" : 'Nouvelle étape'}</DialogTitle>
            <DialogDescription className="sr-only">
              Formulaire de {etapeEditee ? 'modification' : 'création'} d'une étape procédurale
            </DialogDescription>
          </DialogHeader>

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
                    <FormLabel>Nom de l'étape *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ex : Dépôt de la plainte"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="statut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Lucide à la place des emojis */}
                          <SelectItem value="enattente">
                            <span className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              En attente
                            </span>
                          </SelectItem>
                          <SelectItem value="termine">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Terminée
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informations complémentaires…"
                        className="resize-none"
                        rows={3}
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={fermerDialog} disabled={isPending}>
                  Annuler
                </Button>
                <Button type="submit" form={`${uid}-form`} disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {isPending
                    ? etapeEditee
                      ? 'Enregistrement…'
                      : 'Ajout en cours…'
                    : etapeEditee
                      ? 'Enregistrer'
                      : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Alert suppression ───────────────────────────────────── */}
      <AlertDialog open={!!idASupprimer} onOpenChange={(o) => !o && setIdASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette étape ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (idASupprimer) mutSupprimer.mutate(idASupprimer);
                setIdASupprimer(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
