import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Users, Clock, CheckCircle, PauseCircle, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { getDashboardCabinet } from '@/api/cabinet.api';
import type { DashboardCabinetData, StatsCabinet } from '@/api/cabinet.api';
import {
  couleurStatutDossier,
  libelleStatutDossier,
  libelleTypeDossier,
  libellePlan,
  formaterDateCourte,
} from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { nomAffiche } from '@/types';
import { cn } from '@/lib/utils';

// ─── Config cartes stats — tokens CSS ────────────────────────────────────────
interface CarteStat {
  cle: keyof StatsCabinet;
  label: string;
  icone: React.ElementType;
  // tokens sémantiques du projet, adaptatifs dark/light
  couleurIcone: string;
  couleurBg: string;
  description: string;
}

const carteStats: CarteStat[] = [
  {
    cle: 'totalDossiers',
    label: 'Total dossiers',
    icone: FolderOpen,
    couleurIcone: 'text-mode-virement', // bleu token
    couleurBg: 'bg-mode-virement-bg',
    description: 'Dossiers créés',
  },
  {
    cle: 'dossiersEnCours',
    label: 'En cours',
    icone: Clock,
    couleurIcone: 'text-status-actif', // vert token
    couleurBg: 'bg-status-actif-bg',
    description: 'Dossiers actifs',
  },
  {
    cle: 'dossiersSuspendus',
    label: 'Suspendus',
    icone: PauseCircle,
    couleurIcone: 'text-status-suspendu', // orange token
    couleurBg: 'bg-status-suspendu-bg',
    description: 'En attente',
  },
  {
    cle: 'dossiersClotures',
    label: 'Clôturés',
    icone: CheckCircle,
    couleurIcone: 'text-muted-foreground',
    couleurBg: 'bg-muted',
    description: 'Affaires terminées',
  },
  {
    cle: 'totalUtilisateurs',
    label: 'Utilisateurs',
    icone: Users,
    couleurIcone: 'text-primary', // primary token
    couleurBg: 'bg-primary/10',
    description: 'Membres actifs',
  },
];

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CabinetDashboardPage() {
  const utilisateur = useAuthStore((s) => s.utilisateur);

  const { data, isLoading } = useQuery<DashboardCabinetData>({
    queryKey: ['cabinet', 'dashboard'],
    queryFn: getDashboardCabinet,
  });

  const cabinet = data?.cabinet;
  const stats = data?.stats;
  const derniersDossiers = data?.derniersDossiers ?? [];

  const pourcentageDossiers =
    cabinet && cabinet.limites.maxDossiers > 0
      ? Math.min(((stats?.totalDossiers ?? 0) / cabinet.limites.maxDossiers) * 100, 100)
      : 0;

  const pourcentageUtilisateurs =
    cabinet?.limites.maxUtilisateurs && cabinet.limites.maxUtilisateurs !== 99999
      ? Math.min(((stats?.totalUtilisateurs ?? 0) / cabinet.limites.maxUtilisateurs) * 100, 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Bonjour, {utilisateur?.nom?.split(' ')[0]} 👋
          </h2>
          <span className="text-muted-foreground">
            {isLoading ? (
              <Skeleton className="mt-1 h-4 w-48" />
            ) : (
              <>Tableau de bord — {cabinet?.nom}</>
            )}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/cabinet/clients">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau client
            </Link>
          </Button>
          <Button asChild>
            <Link to="/cabinet/dossiers">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau dossier
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Cartes stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {carteStats.map(({ cle, label, icone: Icone, couleurIcone, couleurBg, description }) => (
          <Card key={cle}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <div className={cn('rounded-lg p-1.5', couleurBg)}>
                  <Icone className={cn('h-3.5 w-3.5', couleurIcone)} aria-hidden="true" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold tabular-nums">{stats?.[cle] ?? 0}</p>
              )}
              <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Contenu principal ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Derniers dossiers — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Derniers dossiers</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cabinet/dossiers">
                Voir tout
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              /* Skeleton fidèle au layout réel */
              <div className="divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-3 w-52" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : derniersDossiers.length === 0 ? (
              /* Empty state inline (pas de Card wrapping car on est déjà dans une Card) */
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">Aucun dossier</p>
                  <p className="text-xs text-muted-foreground">
                    Créez votre premier dossier pour commencer
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link to="/cabinet/dossiers">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un dossier
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {derniersDossiers.map((dossier) => (
                  <Link
                    key={dossier._id}
                    to={`/cabinet/dossiers/${dossier._id}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{dossier.titre}</p>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {dossier.reference}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{dossier.client ? nomAffiche(dossier.client) : '—'}</span>
                        <span>·</span>
                        <span>{libelleTypeDossier(dossier.type)}</span>
                        <span>·</span>
                        <span>{formaterDateCourte(dossier.dateOuverture)}</span>
                      </div>
                    </div>
                    <Badge
                      variant={couleurStatutDossier(dossier.statut)}
                      className="shrink-0 text-xs"
                    >
                      {libelleStatutDossier(dossier.statut)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Colonne droite — 1/3 ──────────────────────────────── */}
        <div className="space-y-4">
          {/* Plan actuel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plan actuel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {libellePlan(cabinet?.plan ?? 'starter')}
                    </span>
                    <Badge variant="outline">{cabinet?.statut ?? '—'}</Badge>
                  </div>

                  {/* Barre dossiers */}
                  <BarreProgression
                    label="Dossiers utilisés"
                    valeur={stats?.totalDossiers ?? 0}
                    max={cabinet?.limites.maxDossiers}
                    pourcentage={pourcentageDossiers}
                    // seuil d'alerte : tokens destructive / suspendu / primary
                    couleur={
                      pourcentageDossiers >= 90
                        ? 'bg-destructive'
                        : pourcentageDossiers >= 70
                          ? 'bg-status-suspendu'
                          : 'bg-primary'
                    }
                  />

                  {/* Barre utilisateurs */}
                  <BarreProgression
                    label="Utilisateurs"
                    valeur={stats?.totalUtilisateurs ?? 0}
                    max={cabinet?.limites.maxUtilisateurs}
                    pourcentage={pourcentageUtilisateurs}
                    couleur="bg-primary"
                  />

                  <Separator />

                  <p className="text-xs text-muted-foreground">
                    Stockage max :{' '}
                    <span className="font-medium text-foreground">
                      {cabinet?.limites.maxDocuments === 99999
                        ? 'Illimité'
                        : `${cabinet?.limites.maxDocuments ?? '—'} documents`}
                    </span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Accès rapides */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Accès rapides</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start" size="sm" asChild>
                <Link to="/cabinet/clients">
                  <Users className="mr-2 h-4 w-4" />
                  Gérer les clients
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" size="sm" asChild>
                <Link to="/cabinet/dossiers">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Gérer les dossiers
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" size="sm" asChild>
                <Link to="/cabinet/agenda">
                  <Clock className="mr-2 h-4 w-4" />
                  Voir l'agenda
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── BarreProgression ─────────────────────────────────────────────────────────
interface BarreProgressionProps {
  label: string;
  valeur: number;
  max?: number;
  pourcentage: number;
  couleur: string; // classe Tailwind bg-*
}

function BarreProgression({ label, valeur, max, pourcentage, couleur }: BarreProgressionProps) {
  const maxAffiche = !max || max === 99999 ? '∞' : max;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {valeur} / {maxAffiche}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', couleur)}
          style={{ width: `${pourcentage}%` }}
          role="progressbar"
          aria-valuenow={pourcentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
