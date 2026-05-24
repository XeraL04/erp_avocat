import { useQuery } from '@tanstack/react-query';
import {
  FolderOpen,
  Users,
  Clock,
  CheckCircle,
  PauseCircle,
  Plus,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { getDashboardCabinet } from '@/api/cabinet.api';
import type { DashboardCabinetData, StatsCabinet } from '@/api/cabinet.api';
import { libellePlan, formaterDateCourte } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { nomAffiche, LABELS_SPECIALITE, LABELS_TYPE_AFFAIRE, LABELS_INSTITUTION } from '@/types';

// ─── Hook compteur animé ──────────────────────────────────────────────────────
function useCountUp(valeurCible: number, actif: boolean, duree = 800): number {
  const [valeur, setValeur] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!actif) return;
    const debut = performance.now();
    const animer = (maintenant: number) => {
      const elapsed = maintenant - debut;
      const progress = Math.min(elapsed / duree, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValeur(Math.round(eased * valeurCible));
      if (progress < 1) rafRef.current = requestAnimationFrame(animer);
    };
    rafRef.current = requestAnimationFrame(animer);
    return () => cancelAnimationFrame(rafRef.current);
  }, [valeurCible, actif, duree]);

  return valeur;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CarteStat {
  cle: keyof StatsCabinet;
  labelKey: string;
  descKey: string;
  icone: React.ElementType;
  varCouleur: string;
  varBg: string;
}

// Config statique — les labels sont des clés i18n résolues dans le composant
const CARTE_STATS_CONFIG: CarteStat[] = [
  {
    cle: 'totalDossiers',
    labelKey: 'dashboard:total_dossiers',
    descKey: 'dashboard:desc_total_dossiers',
    icone: FolderOpen,
    varCouleur: 'var(--kpi-dossiers)',
    varBg: 'var(--kpi-dossiers-bg)',
  },
  {
    cle: 'dossiersEnCours',
    labelKey: 'dashboard:active_dossiers',
    descKey: 'dashboard:desc_active_dossiers',
    icone: Clock,
    varCouleur: 'var(--status-encours)',
    varBg: 'var(--status-encours-bg)',
  },
  {
    cle: 'dossiersSuspendus',
    labelKey: 'dashboard:suspended_dossiers',
    descKey: 'dashboard:desc_suspended_dossiers',
    icone: PauseCircle,
    varCouleur: 'var(--status-suspendu)',
    varBg: 'var(--status-suspendu-bg)',
  },
  {
    cle: 'dossiersClotures',
    labelKey: 'dashboard:closed_dossiers',
    descKey: 'dashboard:desc_closed_dossiers',
    icone: CheckCircle,
    varCouleur: 'var(--status-cloture)',
    varBg: 'var(--status-cloture-bg)',
  },
  {
    cle: 'totalUtilisateurs',
    labelKey: 'dashboard:total_users',
    descKey: 'dashboard:desc_total_users',
    icone: Users,
    varCouleur: 'var(--kpi-clients)',
    varBg: 'var(--kpi-clients-bg)',
  },
];

// ─── Carte KPI ────────────────────────────────────────────────────────────────
interface CarteKPIProps {
  config: CarteStat;
  valeur: number;
  isLoading: boolean;
  index: number;
  actif: boolean;
}

function CarteKPI({ config, valeur, isLoading, index, actif }: CarteKPIProps) {
  const { t } = useTranslation();
  const { icone: Icone, varCouleur, varBg, labelKey, descKey } = config;
  const valeurAnimee = useCountUp(valeur, actif && !isLoading);

  return (
    <div
      className="animate-fade-up opacity-0"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
    >
      <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">{t(labelKey)}</p>
              {isLoading ? (
                <Skeleton className="mt-2 h-7 w-12" />
              ) : (
                <p className="mt-1 text-2xl font-bold tabular-nums leading-none">{valeurAnimee}</p>
              )}
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t(descKey)}</p>
            </div>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
              style={{ backgroundColor: varBg }}
            >
              <Icone className="h-4 w-4" style={{ color: varCouleur }} aria-hidden="true" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CabinetDashboardPage() {
  const { t, i18n } = useTranslation();
  const { t: td } = useTranslation('dashboard');
  const estRTL = i18n.language === 'ar';

  const utilisateur = useAuthStore((s) => s.utilisateur);
  const [compteurActif, setCompteurActif] = useState(false);

  const { data, isLoading } = useQuery<DashboardCabinetData>({
    queryKey: ['cabinet', 'dashboard'],
    queryFn: getDashboardCabinet,
  });

  useEffect(() => {
    if (!isLoading && data) {
      const timer = setTimeout(() => setCompteurActif(true), 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, data]);

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

  // Config statut dossier traduite
  const STATUT_DOSSIER_CONFIG: Record<
    string,
    { label: string; varCouleur: string; varBg: string; varBorder: string }
  > = {
    encours: {
      label: td('status_actif'),
      varCouleur: 'var(--status-encours)',
      varBg: 'var(--status-encours-bg)',
      varBorder: 'var(--status-encours-border)',
    },
    suspendu: {
      label: td('status_essai'),
      varCouleur: 'var(--status-suspendu)',
      varBg: 'var(--status-suspendu-bg)',
      varBorder: 'var(--status-suspendu-border)',
    },
    cloture: {
      label: td('status_expire'),
      varCouleur: 'var(--status-cloture)',
      varBg: 'var(--status-cloture-bg)',
      varBorder: 'var(--status-cloture-border)',
    },
  };

  const prenom = utilisateur?.nom?.split(' ')[0] ?? '';

  // Accès rapides traduits
  const accesRapides = [
    { to: '/cabinet/clients', icone: Users, label: t('common:clients') },
    { to: '/cabinet/dossiers', icone: FolderOpen, label: t('common:dossiers') },
    { to: '/cabinet/agenda', icone: Clock, label: t('common:agenda') },
    { to: '/cabinet/documents', icone: Layers, label: t('common:documents') },
  ];

  return (
    <div className="space-y-6 px-1">
      {/* ── En-tête ── */}
      <div
        className="animate-fade-up opacity-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
      >
        <div className="space-y-0.5">
          <h2 className="text-xl font-semibold tracking-tight">
            {td('welcome')}, {prenom}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="mt-1 h-4 w-48" />
            ) : (
              <>
                {td('overview')} — {cabinet?.nom}
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/cabinet/clients">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {estRTL ? 'عميل جديد' : 'Nouveau client'}
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/cabinet/dossiers">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {estRTL ? 'ملف جديد' : 'Nouveau dossier'}
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Cartes KPI ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {CARTE_STATS_CONFIG.map((cfg, i) => (
          <CarteKPI
            key={cfg.cle}
            config={cfg}
            valeur={stats?.[cfg.cle] ?? 0}
            isLoading={isLoading}
            index={i + 1}
            actif={compteurActif}
          />
        ))}
      </div>

      {/* ── Contenu principal ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Derniers dossiers */}
        <div
          className="animate-fade-up opacity-0 lg:col-span-2"
          style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3 pt-4">
              <CardTitle className="text-sm font-semibold">{td('recent_dossiers')}</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                <Link to="/cabinet/dossiers">
                  {estRTL ? 'عرض الكل' : 'Voir tout'}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-56" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : derniersDossiers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <FolderOpen className="h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('common:no_data')}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {estRTL
                        ? 'افتح أول ملف قانوني للبدء'
                        : 'Créez votre premier dossier pour commencer'}
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/cabinet/dossiers">
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {estRTL ? 'فتح ملف' : 'Créer un dossier'}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {derniersDossiers.map((dossier, i) => {
                    const cfg = STATUT_DOSSIER_CONFIG[dossier.statut] ?? {
                      label: dossier.statut,
                      varCouleur: 'var(--muted-foreground)',
                      varBg: 'var(--muted)',
                      varBorder: 'transparent',
                    };

                    const metaItems = [
                      dossier.typeAffaire && LABELS_TYPE_AFFAIRE[dossier.typeAffaire],
                      dossier.specialite && LABELS_SPECIALITE[dossier.specialite],
                      dossier.institution && LABELS_INSTITUTION[dossier.institution],
                      dossier.dossierNumero && `N° ${dossier.dossierNumero}`,
                      formaterDateCourte(dossier.dateOuverture),
                    ].filter(Boolean);

                    return (
                      <Link
                        key={dossier._id}
                        to={`/cabinet/dossiers/${dossier._id}`}
                        className="animate-fade-up opacity-0 group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                        style={{
                          animationDelay: `${480 + i * 50}ms`,
                          animationFillMode: 'forwards',
                        }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 transition-all duration-200 group-hover:bg-primary/14 group-hover:scale-105">
                          <FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold tabular-nums">
                              {dossier.reference}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {typeof dossier.clientId === 'object' && dossier.clientId !== null
                                ? nomAffiche(dossier.clientId)
                                : '—'}
                              {dossier.adversaire && (
                                <>
                                  <span className="mx-1 text-muted-foreground/50">c/</span>
                                  {dossier.adversaire}
                                </>
                              )}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {metaItems.join(' · ')}
                          </p>
                        </div>

                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            color: cfg.varCouleur,
                            backgroundColor: cfg.varBg,
                            border: `1px solid ${cfg.varBorder}`,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Colonne droite ── */}
        <div
          className="animate-fade-up opacity-0 space-y-4"
          style={{ animationDelay: '460ms', animationFillMode: 'forwards' }}
        >
          {/* Plan actuel */}
          <Card>
            <CardHeader className="border-b pb-3 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {estRTL ? 'الخطة الحالية' : 'Plan actuel'}
                </CardTitle>
                {!isLoading && cabinet && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      color: `var(--plan-${cabinet.plan})`,
                      backgroundColor: `var(--plan-${cabinet.plan}-bg)`,
                    }}
                  >
                    {libellePlan(cabinet.plan)}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ) : (
                <>
                  <BarreProgression
                    label={t('common:dossiers')}
                    valeur={stats?.totalDossiers ?? 0}
                    max={cabinet?.limites.maxDossiers}
                    pourcentage={pourcentageDossiers}
                    critique={pourcentageDossiers >= 90}
                    alerte={pourcentageDossiers >= 70}
                    actif={compteurActif}
                    illimiteLabel={estRTL ? 'غير محدود' : 'Illimité'}
                  />

                  <BarreProgression
                    label={estRTL ? 'المستخدمون' : 'Utilisateurs'}
                    valeur={stats?.totalUtilisateurs ?? 0}
                    max={cabinet?.limites.maxUtilisateurs}
                    pourcentage={pourcentageUtilisateurs}
                    critique={false}
                    alerte={false}
                    actif={compteurActif}
                    illimiteLabel={estRTL ? 'غير محدود' : 'Illimité'}
                  />

                  <Separator />

                  <p className="text-xs text-muted-foreground">
                    {estRTL ? 'التخزين' : 'Stockage'} :{' '}
                    <span className="font-medium text-foreground">
                      {cabinet?.limites.maxDocuments === 99999
                        ? estRTL
                          ? 'غير محدود'
                          : 'Illimité'
                        : `${cabinet?.limites.maxDocuments ?? '—'} ${estRTL ? 'مستند' : 'documents'}`}
                    </span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Accès rapides */}
          <Card>
            <CardHeader className="border-b pb-3 pt-4">
              <CardTitle className="text-sm font-semibold">
                {estRTL ? 'وصول سريع' : 'Accès rapides'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 p-3">
              {accesRapides.map(({ to, icone: Icone, label }, i) => (
                <Button
                  key={to}
                  variant="ghost"
                  size="sm"
                  className="animate-fade-up opacity-0 h-8 justify-start gap-2.5 px-3 text-xs font-medium text-foreground/80 hover:text-foreground"
                  style={{
                    animationDelay: `${560 + i * 40}ms`,
                    animationFillMode: 'forwards',
                  }}
                  asChild
                >
                  <Link to={to}>
                    <Icone
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {label}
                  </Link>
                </Button>
              ))}
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
  critique: boolean;
  alerte: boolean;
  actif: boolean;
  illimiteLabel: string;
}

function BarreProgression({
  label,
  valeur,
  max,
  pourcentage,
  critique,
  alerte,
  actif,
  illimiteLabel,
}: BarreProgressionProps) {
  const maxAffiche = !max || max === 99999 ? '∞' : max;
  const [largeur, setLargeur] = useState(0);

  useEffect(() => {
    if (!actif) return;
    const timer = setTimeout(() => setLargeur(pourcentage), 100);
    return () => clearTimeout(timer);
  }, [actif, pourcentage]);

  const couleurBarre = critique
    ? 'var(--destructive)'
    : alerte
      ? 'var(--status-suspendu)'
      : 'var(--primary)';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground/80">
          {valeur} / {maxAffiche === '∞' ? illimiteLabel : maxAffiche}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${largeur}%`, backgroundColor: couleurBarre }}
          role="progressbar"
          aria-valuenow={pourcentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} : ${valeur} / ${maxAffiche}`}
        />
      </div>
    </div>
  );
}
