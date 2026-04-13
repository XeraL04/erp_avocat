import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isPast,
  startOfDay,
  startOfWeek,
  endOfWeek,
  addWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  isWithinInterval,
  eachDayOfInterval,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  FolderOpen,
  FileText,
  ListChecks,
  WifiOff,
  //   Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
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

import {
  listerToutesEtapes,
  modifierEtape,
  supprimerEtape,
  type EtapeAvecDossier,
  type StatutEtape,
} from '@/api/etape.api';
import { useAuthStore } from '@/stores/auth.store';

// ─── Types & helpers ──────────────────────────────────────────────────────────

type PeriodeFiltreType = 'tout' | 'retard' | 'semaine' | 'semaine_prochaine' | 'mois_prochain';

type EtapeClassification = 'retard' | 'nextweek' | 'nextmonth' | 'after' | 'done' | string;

type StatutFiltreType = 'tout' | 'enattente' | 'termine';

interface Groupe {
  id: string;
  label: string;
  emoji: string;
  variante: 'retard' | 'today' | 'upcoming' | 'done';
  etapes: EtapeAvecDossier[];
  ouvertParDefaut: boolean;
}

function classifierEtape(etape: EtapeAvecDossier): EtapeClassification {
  if (etape.statut === 'termine') return 'done';

  const now = new Date();
  const d = parseISO(etape.date);

  if (isPast(startOfDay(d)) && !isToday(d)) return 'retard';

  // Semaine courante → clé par jour "week_YYYY-MM-DD"
  const debutSemaine = startOfWeek(now, { locale: fr });
  const finSemaine = endOfWeek(now, { locale: fr });
  if (isWithinInterval(d, { start: debutSemaine, end: finSemaine })) {
    return `week_${format(d, 'yyyy-MM-dd')}`;
  }

  // Semaine prochaine
  const debutSP = startOfWeek(addWeeks(now, 1), { locale: fr });
  const finSP = endOfWeek(addWeeks(now, 1), { locale: fr });
  if (isWithinInterval(d, { start: debutSP, end: finSP })) return 'nextweek';

  // Mois prochain
  const debutMP = startOfMonth(addMonths(now, 1));
  const finMP = endOfMonth(addMonths(now, 1));
  if (isWithinInterval(d, { start: debutMP, end: finMP })) return 'nextmonth';

  return 'after';
}

function construireGroupes(etapes: EtapeAvecDossier[]): Groupe[] {
  const now = new Date();

  // Initialiser un bucket pour chaque jour de la semaine courante
  const joursSemaine = new Map<string, EtapeAvecDossier[]>();
  eachDayOfInterval({
    start: startOfWeek(now, { locale: fr }),
    end: endOfWeek(now, { locale: fr }),
  }).forEach((jour) => joursSemaine.set(format(jour, 'yyyy-MM-dd'), []));

  const retard: EtapeAvecDossier[] = [];
  const nextweek: EtapeAvecDossier[] = [];
  const nextmonth: EtapeAvecDossier[] = [];
  const after: EtapeAvecDossier[] = [];
  const done: EtapeAvecDossier[] = [];

  for (const e of etapes) {
    const cls = classifierEtape(e);
    if (cls === 'retard') retard.push(e);
    else if (cls === 'done') done.push(e);
    else if (cls === 'nextweek') nextweek.push(e);
    else if (cls === 'nextmonth') nextmonth.push(e);
    else if (cls === 'after') after.push(e);
    else if (cls.startsWith('week_')) {
      const key = cls.replace('week_', '');
      joursSemaine.get(key)?.push(e);
    }
  }

  const groupes: Groupe[] = [];

  // Groupe retard
  if (retard.length)
    groupes.push({
      id: 'retard',
      label: 'En retard',
      emoji: '🔴',
      variante: 'retard',
      etapes: retard,
      ouvertParDefaut: true,
    });

  // Groupes jour par jour pour la semaine courante
  for (const [dateKey, etapesDuJour] of joursSemaine) {
    if (!etapesDuJour.length) continue;
    const date = parseISO(dateKey);
    const label = isToday(date)
      ? "Aujourd'hui"
      : isTomorrow(date)
        ? 'Demain'
        : format(date, 'EEEE d MMMM', { locale: fr });

    groupes.push({
      id: `jour_${dateKey}`,
      label,
      emoji: isToday(date) ? '📅' : '🗓️',
      variante: isToday(date) ? 'today' : 'upcoming',
      etapes: etapesDuJour,
      ouvertParDefaut: true,
    });
  }

  // Semaine prochaine
  if (nextweek.length)
    groupes.push({
      id: 'semaine_prochaine',
      label: 'Semaine prochaine',
      emoji: '📆',
      variante: 'upcoming',
      etapes: nextweek,
      ouvertParDefaut: true,
    });

  // Mois prochain
  if (nextmonth.length)
    groupes.push({
      id: 'mois_prochain',
      label: `${format(addMonths(now, 1), 'MMMM yyyy', { locale: fr })}`,
      emoji: '📅',
      variante: 'upcoming',
      etapes: nextmonth,
      ouvertParDefaut: false,
    });

  // Au-delà
  if (after.length)
    groupes.push({
      id: 'after',
      label: 'Plus tard',
      emoji: '⏳',
      variante: 'upcoming',
      etapes: after,
      ouvertParDefaut: false,
    });

  // Terminées
  if (done.length)
    groupes.push({
      id: 'done',
      label: 'Terminées',
      emoji: '✅',
      variante: 'done',
      etapes: done,
      ouvertParDefaut: false,
    });

  return groupes;
}

function formaterDateRelative(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return 'Demain';
  return format(d, 'EEEE d MMMM yyyy', { locale: fr });
}

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function dateInputToISO(d: string): string {
  return `${d}T00:00:00.000Z`;
}

// ─── Schéma form édition ──────────────────────────────────────────────────────

const schemaModif = z.object({
  nom: z.string().trim().min(2, 'Minimum 2 caractères'),
  date: z.string().min(1, 'Date obligatoire'),
  statut: z.enum(['termine', 'enattente'] as const),
  notes: z.string().optional(),
});
type FormModif = z.infer<typeof schemaModif>;

// ─── Composant principal ──────────────────────────────────────────────────────

export default function EtapesPage() {
  const qc = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const peutModifier = utilisateur?.role === 'admin' || utilisateur?.role === 'assistant';
  const peutSupprimer = utilisateur?.role === 'admin';

  const [filtrePeriode, setFiltrePeriode] = useState<PeriodeFiltreType>('tout');
  const [filtreStatut, setFiltreStatut] = useState<StatutFiltreType>('tout');
  const [groupesOuverts, setGroupesOuverts] = useState<Record<string, boolean>>({});
  const [etapeEditee, setEtapeEditee] = useState<EtapeAvecDossier | null>(null);
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null);

  // ── Query ─────────────────────────────────────────────────────────────────
  const {
    data: toutesEtapes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['etapes', 'global', filtreStatut],
    queryFn: () =>
      listerToutesEtapes({
        statut: filtreStatut !== 'tout' ? (filtreStatut as StatutEtape) : undefined,
      }),
  });

  // Filtre période côté client
  const etapesFiltrees = toutesEtapes.filter((e) => {
    if (filtrePeriode === 'tout') return true;
    const cls = classifierEtape(e);
    if (filtrePeriode === 'retard') return cls === 'retard';
    if (filtrePeriode === 'semaine') return cls.startsWith('week_');
    if (filtrePeriode === 'semaine_prochaine') return cls === 'nextweek';
    if (filtrePeriode === 'mois_prochain') return cls === 'nextmonth';
    return true;
  });

  // Stats KPI — ajouter nbSemaine
  const nbSemaine = toutesEtapes.filter((e) => classifierEtape(e).startsWith('week_')).length;

  const groupes = construireGroupes(etapesFiltrees);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const nbRetard = toutesEtapes.filter(
    (e) =>
      e.statut === 'enattente' && isPast(startOfDay(parseISO(e.date))) && !isToday(parseISO(e.date))
  ).length;
  // ← Supprimer cette ligne
  // const nbToday = toutesEtapes.filter(
  //   (e) => isToday(parseISO(e.date)) && e.statut === 'enattente'
  // ).length;
  const nbTotal = toutesEtapes.length;
  const nbTerminees = toutesEtapes.filter((e) => e.statut === 'termine').length;

  // ── Toggle groupe ─────────────────────────────────────────────────────────
  const toggleGroupe = (id: string, defaut: boolean) => {
    setGroupesOuverts((prev) => ({
      ...prev,
      [id]: id in prev ? !prev[id] : !defaut,
    }));
  };

  const estOuvert = (id: string, defaut: boolean) =>
    id in groupesOuverts ? groupesOuverts[id] : defaut;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['etapes'] });

  // ── Mutation bascule statut ───────────────────────────────────────────────
  const mutBasculer = useMutation({
    mutationFn: (etape: EtapeAvecDossier) =>
      modifierEtape(etape.id, {
        statut: etape.statut === 'termine' ? 'enattente' : 'termine',
      }),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Impossible de changer le statut'),
  });

  // ── Mutation suppression ──────────────────────────────────────────────────
  const mutSupprimer = useMutation({
    mutationFn: (id: string) => supprimerEtape(id),
    onSuccess: () => {
      invalidate();
      toast.success('Étape supprimée');
      setIdASupprimer(null);
    },
    onError: () => toast.error('Impossible de supprimer'),
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Programme</h2>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })} · toutes les étapes procédurales
        </p>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="En retard"
          value={nbRetard}
          icone={<AlertTriangle className="h-4 w-4" />}
          couleur={nbRetard > 0 ? 'text-destructive' : 'text-muted-foreground'}
          bgCouleur={nbRetard > 0 ? 'bg-destructive/10' : 'bg-muted'}
          onClick={() => {
            setFiltrePeriode('retard');
            setFiltreStatut('enattente');
          }}
        />
        <KpiCard
          label="Cette semaine"
          value={nbSemaine}
          icone={<Calendar className="h-4 w-4" />}
          couleur={nbSemaine > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}
          bgCouleur={nbSemaine > 0 ? 'bg-orange-100 dark:bg-orange-950/30' : 'bg-muted'}
          onClick={() => {
            setFiltrePeriode('semaine');
            setFiltreStatut('enattente');
          }}
        />
        <KpiCard
          label="Total"
          value={nbTotal}
          icone={<ListChecks className="h-4 w-4" />}
          couleur="text-primary"
          bgCouleur="bg-primary/10"
          onClick={() => {
            setFiltrePeriode('tout');
            setFiltreStatut('tout');
          }}
        />
        <KpiCard
          label="Terminées"
          value={nbTerminees}
          icone={<CheckCircle2 className="h-4 w-4" />}
          couleur="text-green-600 dark:text-green-400"
          bgCouleur="bg-green-100 dark:bg-green-950/30"
          onClick={() => {
            setFiltrePeriode('tout');
            setFiltreStatut('termine');
          }}
        />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filtrePeriode}
          onValueChange={(v) => setFiltrePeriode(v as PeriodeFiltreType)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tout">Toutes les dates</SelectItem>
            <SelectItem value="retard">🔴 En retard</SelectItem>
            <SelectItem value="semaine">📅 Cette semaine</SelectItem>
            <SelectItem value="semaine_prochaine">📆 Semaine prochaine</SelectItem>
            <SelectItem value="mois_prochain">🗓️ Mois prochain</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtreStatut} onValueChange={(v) => setFiltreStatut(v as StatutFiltreType)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tout">Tous les statuts</SelectItem>
            <SelectItem value="enattente">⏳ En attente</SelectItem>
            <SelectItem value="termine">✅ Terminées</SelectItem>
          </SelectContent>
        </Select>

        {(filtrePeriode !== 'tout' || filtreStatut !== 'tout') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFiltrePeriode('tout');
              setFiltreStatut('tout');
            }}
          >
            ✕ Réinitialiser
          </Button>
        )}
      </div>

      {/* Erreur */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <WifiOff className="h-7 w-7 text-destructive" />
            </div>
            <p className="font-medium">Impossible de charger les étapes</p>
            <Button
              variant="outline"
              onClick={() => qc.invalidateQueries({ queryKey: ['etapes', 'global'] })}
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-8 w-40 rounded-md" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state global */}
      {!isLoading && !isError && groupes.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <CalendarClock className="h-8 w-8 opacity-40" />
          </div>
          <div>
            <p className="font-medium text-foreground">Aucune étape trouvée</p>
            <p className="mt-1 text-sm">
              {filtrePeriode !== 'tout' || filtreStatut !== 'tout'
                ? 'Modifiez les filtres pour voir plus de résultats'
                : 'Les étapes procédurales sont créées depuis les dossiers'}
            </p>
          </div>
        </div>
      )}

      {/* Groupes */}
      {!isLoading && !isError && groupes.length > 0 && (
        <div className="space-y-6">
          {groupes.map((groupe) => {
            const ouvert = estOuvert(groupe.id, groupe.ouvertParDefaut);
            return (
              <div key={groupe.id} className="space-y-2">
                {/* Titre du groupe */}
                <button
                  type="button"
                  onClick={() => toggleGroupe(groupe.id, groupe.ouvertParDefaut)}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/50"
                >
                  {ouvert ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold">
                    {groupe.emoji} {groupe.label}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`ml-1 tabular-nums ${
                      groupe.variante === 'retard'
                        ? 'bg-destructive/10 text-destructive'
                        : groupe.variante === 'today'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                          : ''
                    }`}
                  >
                    {groupe.etapes.length}
                  </Badge>
                </button>

                {/* Étapes du groupe */}
                {ouvert && (
                  <div className="relative ml-3">
                    <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-2">
                      {groupe.etapes.map((etape) => (
                        <CarteEtape
                          key={etape.id}
                          etape={etape}
                          variante={groupe.variante}
                          peutModifier={peutModifier}
                          peutSupprimer={peutSupprimer}
                          onBasculer={() => mutBasculer.mutate(etape)}
                          basculeEnCours={mutBasculer.isPending}
                          onEditer={() => setEtapeEditee(etape)}
                          onSupprimer={() => setIdASupprimer(etape.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog édition */}
      {etapeEditee && (
        <DialogEditerEtape
          etape={etapeEditee}
          onFermer={() => setEtapeEditee(null)}
          onSuccess={() => {
            invalidate();
            setEtapeEditee(null);
          }}
        />
      )}

      {/* Confirmation suppression */}
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
              onClick={() => idASupprimer && mutSupprimer.mutate(idASupprimer)}
              disabled={mutSupprimer.isPending}
            >
              {mutSupprimer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Carte KPI ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  icone: React.ReactNode;
  couleur: string;
  bgCouleur: string;
  onClick: () => void;
}

function KpiCard({ label, value, icone, couleur, bgCouleur, onClick }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:shadow-md active:scale-95"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bgCouleur} ${couleur}`}
      >
        {icone}
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold tabular-nums ${couleur}`}>{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </button>
  );
}

// ─── Carte étape ──────────────────────────────────────────────────────────────

interface CarteEtapeProps {
  etape: EtapeAvecDossier;
  variante: Groupe['variante'];
  peutModifier: boolean;
  peutSupprimer: boolean;
  onBasculer: () => void;
  basculeEnCours: boolean;
  onEditer: () => void;
  onSupprimer: () => void;
}

function CarteEtape({
  etape,
  variante,
  peutModifier,
  peutSupprimer,
  onBasculer,
  basculeEnCours,
  onEditer,
  onSupprimer,
}: CarteEtapeProps) {
  const estTerminee = etape.statut === 'termine';
  const estEnRetard = variante === 'retard';

  return (
    <div className="relative flex gap-3">
      {/* Bouton bascule statut */}
      <button
        type="button"
        onClick={onBasculer}
        disabled={!peutModifier || basculeEnCours}
        className={`relative z-10 mt-3 shrink-0 rounded-full transition-colors
          ${peutModifier ? 'cursor-pointer' : 'cursor-default'}
          ${
            estTerminee
              ? 'text-primary hover:text-primary/70'
              : estEnRetard
                ? 'text-destructive hover:text-destructive/70'
                : 'text-muted-foreground hover:text-foreground'
          }`}
        title={
          peutModifier ? (estTerminee ? 'Marquer en attente' : 'Marquer comme terminée') : undefined
        }
      >
        {estTerminee ? (
          <CheckCircle2 className="h-5 w-5 fill-primary/10" />
        ) : (
          <Circle className={`h-5 w-5 ${estEnRetard ? 'text-destructive/70' : ''}`} />
        )}
      </button>

      {/* Carte */}
      <div
        className={`mb-1 flex-1 rounded-lg border p-3 transition-colors ${
          estTerminee
            ? 'bg-muted/20 opacity-60'
            : estEnRetard
              ? 'border-destructive/30 bg-destructive/5'
              : variante === 'today'
                ? 'border-orange-300/50 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-950/10'
                : 'bg-card'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Infos */}
          <div className="min-w-0 space-y-1">
            {/* Nom + badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-sm font-medium leading-snug ${
                  estTerminee ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {etape.nom}
              </span>
              {estEnRetard && (
                <Badge className="bg-destructive/10 px-1.5 py-0 text-xs text-destructive hover:bg-destructive/20">
                  En retard
                </Badge>
              )}
            </div>

            {/* Méta : date + dossier + notes */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span
                className={`font-medium capitalize ${
                  estEnRetard
                    ? 'text-destructive'
                    : variante === 'today'
                      ? 'text-orange-600 dark:text-orange-400'
                      : ''
                }`}
              >
                {formaterDateRelative(etape.date)}
              </span>

              {etape.dossier && (
                <Link
                  to={`/cabinet/dossiers/${etape.dossier._id}`}
                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FolderOpen className="h-3 w-3 shrink-0" />
                  <span className="font-mono">{etape.dossier.reference}</span>
                  <span className="hidden sm:inline truncate max-w-40">
                    · {etape.dossier.titre}
                  </span>
                </Link>
              )}

              {etape.notes && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="max-w-50 truncate">{etape.notes}</span>
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
                onClick={onEditer}
                title="Modifier"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {peutSupprimer && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onSupprimer}
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dialog édition ───────────────────────────────────────────────────────────

interface DialogEditerEtapeProps {
  etape: EtapeAvecDossier;
  onFermer: () => void;
  onSuccess: () => void;
}

function DialogEditerEtape({ etape, onFermer, onSuccess }: DialogEditerEtapeProps) {
  const form = useForm<FormModif>({
    resolver: zodResolver(schemaModif),
    defaultValues: {
      nom: etape.nom,
      date: isoToDateInput(etape.date),
      statut: etape.statut,
      notes: etape.notes ?? '',
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (v: FormModif) =>
      modifierEtape(etape.id, {
        nom: v.nom,
        date: dateInputToISO(v.date),
        statut: v.statut,
        notes: v.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Étape modifiée');
      onSuccess();
    },
    onError: () => toast.error('Impossible de modifier'),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'étape</DialogTitle>
          <DialogDescription className="sr-only">
            Formulaire de modification d'une étape procédurale
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Textarea className="resize-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
