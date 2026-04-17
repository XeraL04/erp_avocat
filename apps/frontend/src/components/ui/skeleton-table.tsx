import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonTableProps {
  /** Nombre de lignes à afficher (défaut: 5) */
  lignes?: number;
  /** Affiche une colonne avatar/icône à gauche */
  avecAvatar?: boolean;
  /** Affiche une colonne badge à droite */
  avecBadge?: boolean;
  className?: string;
}

export function SkeletonTable({
  lignes = 5,
  avecAvatar = true,
  avecBadge = true,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn('divide-y', className)}>
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          {/* Avatar / icône gauche */}
          {avecAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}

          {/* Contenu principal */}
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>

          {/* Badge statut */}
          {avecBadge && <Skeleton className="h-5 w-20 rounded-full shrink-0" />}

          {/* Bouton action */}
          <Skeleton className="h-8 w-8 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}
