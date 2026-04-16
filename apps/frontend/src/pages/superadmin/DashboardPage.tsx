import { useQuery } from '@tanstack/react-query';
import { Building2, Users, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatsDashboard } from '@/api/superadmin.api';
import type { DashboardData, StatsDashboard } from '@/api/superadmin.api';
import { couleurStatutTenant, libellePlan } from '@/lib/utils';

interface CarteStat {
  cle: keyof StatsDashboard;
  label: string;
  description: string;
  icone: React.ElementType;
  couleurIcone: string;
  couleurBg: string;
}

const carteStats: CarteStat[] = [
  {
    cle: 'totalTenants',
    label: 'Total cabinets',
    description: 'Tous les cabinets inscrits',
    icone: Building2,
    couleurIcone: 'text-blue-600',
    couleurBg: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    cle: 'tenantsActifs',
    label: 'Cabinets actifs',
    description: 'Abonnements en cours',
    icone: TrendingUp,
    couleurIcone: 'text-green-600',
    couleurBg: 'bg-green-50 dark:bg-green-950',
  },
  {
    cle: 'tenantsEssai',
    label: "Période d'essai",
    description: 'Essai gratuit 14 jours',
    icone: Clock,
    couleurIcone: 'text-yellow-600',
    couleurBg: 'bg-yellow-50 dark:bg-yellow-950',
  },
  {
    cle: 'tenantsSuspendus',
    label: 'Suspendus',
    description: 'Accès bloqué',
    icone: AlertCircle,
    couleurIcone: 'text-red-600',
    couleurBg: 'bg-red-50 dark:bg-red-950',
  },
  {
    cle: 'tenantsExpires',
    label: 'Expirés',
    description: 'Abonnement terminé',
    icone: Users,
    couleurIcone: 'text-purple-600',
    couleurBg: 'bg-purple-50 dark:bg-purple-950',
  },
];

export default function SuperAdminDashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['superadmin', 'dashboard'],
    queryFn: getStatsDashboard,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h2>
          <p className="text-muted-foreground">Statistiques globales de la plateforme ERP Avocat</p>
        </div>
        <Button asChild>
          <Link to="/superadmin/tenants">Gérer les cabinets</Link>
        </Button>
      </div>

      {/* Cartes de stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {carteStats.map(({ cle, label, description, icone: Icone, couleurIcone, couleurBg }) => (
          <Card key={cle} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <div className={`rounded-lg p-2 ${couleurBg}`}>
                  <Icone className={`h-4 w-4 ${couleurIcone}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-bold">{data?.stats[cle] ?? 0}</p>
              )}
              <CardDescription className="mt-1 text-xs">{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Derniers inscrits */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Derniers cabinets inscrits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : data?.derniersInscrits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun cabinet</p>
            ) : (
              data?.derniersInscrits.map((cabinet) => (
                <div key={cabinet._id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{cabinet.nom}</p>
                    <p className="text-xs text-muted-foreground">{cabinet.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{libellePlan(cabinet.plan)}</Badge>
                    <Badge variant={couleurStatutTenant(cabinet.statut)}>{cabinet.statut}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations plateforme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plans disponibles</span>
              <span className="font-medium">Starter · Pro · Premium</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Devise</span>
              <span className="font-medium">Dinar Algérien (DA)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Période d'essai</span>
              <span className="font-medium">14 jours gratuits</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
