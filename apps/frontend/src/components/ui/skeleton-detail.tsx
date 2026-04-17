import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonDetailProps {
  /** Nombre de cards d'info à afficher (défaut: 2) */
  cards?: number;
  /** Affiche un bloc de tabs */
  avecTabs?: boolean;
  className?: string;
}

export function SkeletonDetail({ cards = 2, avecTabs = true, className }: SkeletonDetailProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Fil d'ariane */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* En-tête page */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
        {/* Boutons actions */}
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Tabs */}
      {avecTabs && (
        <div className="flex gap-1 border-b pb-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-t-md rounded-b-none" />
          ))}
        </div>
      )}

      {/* Cards d'information */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
