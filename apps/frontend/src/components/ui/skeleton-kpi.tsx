import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonKpiProps {
  /** Nombre de cartes KPI (défaut: 4) */
  cartes?: number;
  /** Affiche une ligne de graphique/tableau sous les KPIs */
  avecContenu?: boolean;
  className?: string;
}

export function SkeletonKpi({ cartes = 4, avecContenu = true, className }: SkeletonKpiProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Titre page */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Cartes KPI */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cartes }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            {/* Icône + label */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            {/* Valeur principale */}
            <Skeleton className="h-8 w-20" />
            {/* Sous-label */}
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Contenu secondaire (liste d'alertes, tableau…) */}
      {avecContenu && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Bloc gauche */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloc droit */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
