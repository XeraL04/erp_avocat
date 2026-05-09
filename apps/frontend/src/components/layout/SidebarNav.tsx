import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface ItemNav {
  label: string;
  href: string;
  icone: LucideIcon;
}

interface SidebarNavProps {
  items: ItemNav[];
  onNavigate?: () => void;
}

export default function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navigation principale">
      {items.map(({ label, href, icone: Icone }) => (
        <NavLink
          key={href}
          to={href}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium',
              'transition-all duration-200',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/72 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary-foreground/10 text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/65 group-hover:text-sidebar-accent-foreground'
                )}
              >
                <Icone className="h-4 w-4 shrink-0" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1 truncate">{label}</span>

              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary-foreground/70 opacity-100'
                    : 'bg-transparent opacity-0 group-hover:opacity-40'
                )}
                aria-hidden="true"
              />

              {isActive && (
                <span
                  className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-sidebar-primary-foreground/75"
                  aria-hidden="true"
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
