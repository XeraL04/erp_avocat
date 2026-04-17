import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

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
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Navigation principale">
      {items.map(({ label, href, icone: Icone }) => (
        <NavLink
          key={href}
          to={href}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
              'transition-colors duration-150',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icone
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors duration-150',
                  isActive ? 'opacity-100' : 'opacity-70'
                )}
                aria-hidden="true"
              />
              <span className="truncate">{label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/60 shrink-0" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
