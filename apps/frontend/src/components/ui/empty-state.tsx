import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** Icône Lucide à afficher (ex: Users, FolderOpen…) */
  icone: LucideIcon;
  /** Titre principal */
  titre: string;
  /** Description secondaire */
  description: string;
  /** Bouton d'action optionnel */
  action?: {
    label: string;
    onClick: () => void;
    icone?: LucideIcon;
  };
  /** Padding vertical — 'sm' pour les tabs, 'md' (défaut) pour les pages */
  taille?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  icone: Icone,
  titre,
  description,
  action,
  taille = 'md',
  className,
}: EmptyStateProps) {
  const ActionIcone = action?.icone;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        taille === 'sm' && 'py-10 px-6',
        taille === 'md' && 'py-16 px-8',
        taille === 'lg' && 'py-24 px-8',
        className
      )}
    >
      {/* Icône dans un cercle atténué */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icone className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
      </div>

      {/* Texte */}
      <h3 className="text-sm font-semibold text-foreground mb-1">{titre}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>

      {/* Action */}
      {action && (
        <Button size="sm" onClick={action.onClick} className="mt-5">
          {ActionIcone && <ActionIcone className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
