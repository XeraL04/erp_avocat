// apps/frontend/src/pages/cabinet/AgendaPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isPast,
  isFuture,
  parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';
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

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';

import {
  listerTousEvenements,
  creerEvenement,
  modifierEvenement,
  supprimerEvenement,
  type Evenement,
  type TypeEvenement,
} from '@/api/evenement.api';

// ─── Schéma Zod ──────────────────────────────────────────────────────────────
const schema = z.object({
  titre: z.string().trim().min(2, 'Le titre doit contenir au moins 2 caractères'),
  type: z.enum(['audience', 'rdv', 'rappel'], { required_error: 'Le type est obligatoire' }),
  dateHeure: z.string().min(1, 'La date et heure sont obligatoires'),
  lieu: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Config types ─────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  TypeEvenement,
  { label: string; icone: React.ElementType; classe: string }
> = {
  audience: {
    label: 'Audience',
    icone: Scale,
    classe: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  rdv: {
    label: 'Rendez-vous',
    icone: Users,
    classe: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  rappel: {
    label: 'Rappel',
    icone: Bell,
    classe: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
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

function etiquetteDate(dateHeure: string): string {
  const d = parseISO(dateHeure);
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return 'Demain';
  if (isThisWeek(d, { locale: fr })) return format(d, 'EEEE', { locale: fr });
  return format(d, 'd MMMM yyyy', { locale: fr });
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

  if (periode === 'a_venir') {
    liste = liste.filter((e) => isFuture(parseISO(e.dateHeure)) || isToday(parseISO(e.dateHeure)));
  } else if (periode === 'aujourd_hui') {
    liste = liste.filter((e) => isToday(parseISO(e.dateHeure)));
  } else if (periode === 'cette_semaine') {
    liste = liste.filter((e) => isThisWeek(parseISO(e.dateHeure), { locale: fr }));
  }

  return liste.sort(
    (a, b) => parseISO(a.dateHeure).getTime() - parseISO(b.dateHeure).getTime()
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function AgendaPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.utilisateur?.role);
  const peutModifier = role === 'admin' || role === 'assistant';
  const peutSupprimer = role === 'admin';

  const [filtrePeriode, setFiltrePeriode] = useState<FiltrePeriode>('a_venir');
  const [filtreType, setFiltreType] = useState<FiltreType>('tous');
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [evenementEdite, setEvenementEdite] = useState<Evenement | null>(null);
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null);

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['evenements', 'global'],
    queryFn: () => listerTousEvenements({ limit: 500 }),
  });

  const tousEvenements = data?.evenements ?? [];
  const evenements = appliquerFiltres(tousEvenements, filtrePeriode, filtreType);
  const groupes = grouperParJour(evenements);
  const nbAujourdhui = tousEvenements.filter((e) => isToday(parseISO(e.dateHeure))).length;

  // ── Formulaire ────────────────────────────────────────────────────────────
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

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['evenements'] });

  const mutCreer = useMutation({
    mutationFn: (v: FormValues) =>
      creerEvenement({
        titre: v.titre,
        type: v.type,
        dateHeure: datetimeLocalToISO(v.dateHeure),
        lieu: v.lieu || undefined,
        notes: v.notes || undefined,
        // dossierId absent → événement non lié à un dossier spécifique
      }),
    onSuccess: () => {
      invalidate();
      fermerDialog();
      toast.success('Événement ajouté');
    },
    onError: () => toast.error("Impossible d'ajouter l'événement"),
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
      toast.success('Événement modifié');
    },
    onError: () => toast.error('Impossible de modifier'),
  });

  const mutSupprimer = useMutation({
    mutationFn: (id: string) => supprimerEvenement(id),
    onSuccess: () => {
      invalidate();
      toast.success('Événement supprimé');
    },
    onError: () => toast.error('Une erreur est survenue'),
  });

  const onSubmit = (v: FormValues) =>
    evenementEdite ? mutModifier.mutate(v) : mutCreer.mutate(v);
  const isPending = mutCreer.isPending || mutModifier.isPending;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agenda</h2>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            {tousEvenements.length} événement{tousEvenements.length > 1 ? 's' : ''}
            {nbAujourdhui > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {nbAujourdhui} aujourd'hui
              </span>
            )}
          </p>
        </div>
        {peutModifier && (
          <Button size="sm" onClick={ouvrirCreation}>
            <Plus className="mr-1.5 h-4 w-4" />
            Planifier
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={filtrePeriode}
          onValueChange={(v) => setFiltrePeriode(v as FiltrePeriode)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a_venir">À venir</SelectItem>
            <SelectItem value="aujourd_hui">Aujourd'hui</SelectItem>
            <SelectItem value="cette_semaine">Cette semaine</SelectItem>
            <SelectItem value="tous">Tout l'historique</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filtreType}
          onValueChange={(v) => setFiltreType(v as FiltreType)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les types</SelectItem>
            <SelectItem value="audience">⚖️ Audiences</SelectItem>
            <SelectItem value="rdv">👥 Rendez-vous</SelectItem>
            <SelectItem value="rappel">🔔 Rappels</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && evenements.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <CalendarX className="h-12 w-12 opacity-30" />
          <p className="font-medium">
            {filtrePeriode === 'a_venir' ? 'Aucun événement à venir' : 'Aucun événement'}
          </p>
          <p className="text-sm">
            {filtrePeriode === 'a_venir'
              ? 'Planifiez vos audiences et rendez-vous depuis les dossiers ou ici'
              : 'Modifiez les filtres pour afficher plus de résultats'}
          </p>
          {peutModifier && filtrePeriode === 'a_venir' && (
            <Button variant="outline" size="sm" onClick={ouvrirCreation}>
              <Plus className="mr-1.5 h-4 w-4" />
              Planifier un événement
            </Button>
          )}
        </div>
      )}

      {/* Liste groupée par jour */}
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
                  {items.length} evt{items.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Cartes événements */}
              <div className="space-y-2">
                {items.map((evt) => {
                  const cfg = TYPE_CONFIG[evt.type];
                  const Icone = cfg.icone;
                  const passe =
                    isPast(parseISO(evt.dateHeure)) && !isToday(parseISO(evt.dateHeure));

                  return (
                    <div
                      key={evt.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors
                        ${passe ? 'bg-muted/30 opacity-60' : 'bg-card hover:bg-accent/30'}`}
                    >
                      {/* Icône type */}
                      <div className="mt-0.5 shrink-0">
                        <Icone className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Contenu */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium leading-tight">{evt.titre}</span>
                          <Badge className={`px-1.5 py-0 text-xs ${cfg.classe}`}>
                            {cfg.label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-medium">
                            {format(parseISO(evt.dateHeure), "HH'h'mm", { locale: fr })}
                          </span>
                          {evt.lieu && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {evt.lieu}
                            </span>
                          )}
                          {evt.dossier && (
                            <Link
                              to={`/cabinet/dossiers/${evt.dossier.id}`}
                              className="flex items-center gap-1 transition-colors hover:text-foreground"
                            >
                              <FolderOpen className="h-3 w-3" />
                              <span className="font-mono">{evt.dossier.reference}</span>
                            </Link>
                          )}
                          {evt.notes && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span className="max-w-45 truncate">{evt.notes}</span>
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
                            onClick={() => ouvrirEdition(evt)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {peutSupprimer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setIdASupprimer(evt.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* ── Dialog Créer / Modifier ─────────────────────────────────────────── */}
      <Dialog open={dialogOuvert} onOpenChange={(o) => !o && fermerDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {evenementEdite ? "Modifier l'événement" : 'Nouvel événement'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulaire de {evenementEdite ? 'modification' : 'création'} d'un événement
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="titre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex : Audience correctionnelle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="audience">⚖️ Audience</SelectItem>
                          <SelectItem value="rdv">👥 Rendez-vous</SelectItem>
                          <SelectItem value="rappel">🔔 Rappel</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateHeure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & heure *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="lieu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ex : Tribunal de Constantine – Salle 3"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                <Button
                  type="button"
                  variant="outline"
                  onClick={fermerDialog}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {evenementEdite ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Alert suppression ─────────────────────────────────────────────── */}
      <AlertDialog open={!!idASupprimer} onOpenChange={(o) => !o && setIdASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
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