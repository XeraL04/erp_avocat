import { useState } from 'react';
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

// ─── Schéma Zod ───────────────────────────────────────────────────────────────

const schema = z.object({
  nom: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères'),
  date: z.string().min(1, 'La date est obligatoire'),
  statut: z.enum(['termine', 'enattente']),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "2026-04-15T09:00:00.000Z" → "2026-04-15" pour <input type="date"> */
function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

/** ✅ "2026-04-15" → "2026-04-15T00:00:00.000Z" (sans ambiguïté timezone) */
function dateInputToISO(d: string): string {
  return `${d}T00:00:00.000Z`;
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  dossierId: string;
}

export default function TabEtapes({ dossierId }: Props) {
  const qc = useQueryClient();
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

  // ── Stats rapides ──────────────────────────────────────────────────────────
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

  /** Bascule rapide terminé ↔ en attente sans ouvrir le dialog */
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

  // ─── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* En-tête + progression */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <ListChecks className="h-4 w-4" />
            <span>
              {nbTerminees}/{nbTotal} étape{nbTotal > 1 ? 's' : ''}
            </span>
          </div>
          {nbTotal > 0 && (
            <div className="flex items-center gap-2 min-w-30">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progression}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums w-8 shrink-0">
                {progression}%
              </span>
            </div>
          )}
        </div>
        {peutModifier && (
          <Button size="sm" onClick={ouvrirCreation} className="shrink-0">
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter
          </Button>
        )}
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-5 w-5 rounded-full shrink-0 mt-0.5" />
              <Skeleton className="h-16 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && etapes.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <ListChecks className="h-10 w-10 opacity-30" />
          <p className="text-sm">Aucune étape procédurale</p>
          {peutModifier && (
            <Button variant="outline" size="sm" onClick={ouvrirCreation}>
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter la première étape
            </Button>
          )}
        </div>
      )}

      {/* Timeline */}
      {!isLoading && etapes.length > 0 && (
        <div className="relative">
          <div className="absolute left-2.25 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-2">
            {etapes.map((etape, index) => {
              const estTerminee = etape.statut === 'termine';
              return (
                <div key={etape.id ?? index} className="relative flex gap-3">
                  <button
                    type="button"
                    onClick={() => peutModifier && mutBasculer.mutate(etape)}
                    disabled={!peutModifier || mutBasculer.isPending}
                    className={`relative z-10 mt-2 shrink-0 rounded-full transition-colors
                      ${peutModifier ? 'cursor-pointer' : 'cursor-default'}
                      ${
                        estTerminee
                          ? 'text-primary hover:text-primary/80'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    title={
                      peutModifier
                        ? estTerminee
                          ? 'Marquer en attente'
                          : 'Marquer comme terminée'
                        : undefined
                    }
                  >
                    {estTerminee ? (
                      <CheckCircle2 className="h-5 w-5 fill-primary/10" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div
                    className={`flex-1 rounded-lg border p-3 transition-colors
                    ${estTerminee ? 'bg-muted/30 opacity-75' : 'bg-card'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-medium leading-tight
                            ${estTerminee ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {etape.nom}
                          </span>
                          <Badge
                            variant={estTerminee ? 'default' : 'secondary'}
                            className={`text-xs px-1.5 py-0 ${
                              estTerminee
                                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                            }`}
                          >
                            {estTerminee ? 'Terminée' : 'En attente'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{format(parseISO(etape.date), 'd MMMM yyyy', { locale: fr })}</span>
                          {etape.notes && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="max-w-55 truncate">{etape.notes}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {peutModifier && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => ouvrirEdition(etape)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {peutSupprimer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setIdASupprimer(etape.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* ── Dialog Créer / Modifier ── */}
      <Dialog open={dialogOuvert} onOpenChange={(o) => !o && fermerDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{etapeEditee ? "Modifier l'étape" : 'Nouvelle étape'}</DialogTitle>
            <DialogDescription className="sr-only">
              Formulaire de {etapeEditee ? 'modification' : 'création'} d'une étape procédurale
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'étape *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex : Dépôt de la plainte" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="enattente">⏳ En attente</SelectItem>
                          <SelectItem value="termine">✅ Terminée</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informations complémentaires..."
                        className="resize-none"
                        rows={3}
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
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {etapeEditee ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Alert suppression ── */}
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
