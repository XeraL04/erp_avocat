import {
  Building2,
  Calendar,
  // CalendarClock,
  DollarSign,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Paperclip,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';

import SidebarNav, { type ItemNav } from './SidebarNav';
import { useAuthStore } from '@/stores/auth.store';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, initialesAvatar } from '@/lib/utils';

interface SidebarProps {
  onClose?: () => void;
}

const navSuperAdmin: ItemNav[] = [
  { label: 'Dashboard', href: '/superadmin/dashboard', icone: LayoutDashboard },
  { label: 'Cabinets', href: '/superadmin/tenants', icone: Building2 },
];

const navCabinet: ItemNav[] = [
  { label: 'Dashboard', href: '/cabinet/dashboard', icone: LayoutDashboard },
  { label: 'Clients', href: '/cabinet/clients', icone: Users },
  { label: 'Dossiers', href: '/cabinet/dossiers', icone: FolderOpen },
  { label: 'Agenda', href: '/cabinet/agenda', icone: Calendar },
  { label: 'Paiements', href: '/cabinet/paiements', icone: DollarSign },
  { label: 'Factures', href: '/cabinet/factures', icone: FileText },
  { label: 'Documents', href: '/cabinet/documents', icone: Paperclip },
  // { label: 'Programme', href: '/cabinet/programme', icone: CalendarClock },
];

const ROLE_CONFIG: Record<string, { label: string; classes: string }> = {
  superadmin: {
    label: 'Super Admin',
    classes: 'bg-plan-premium-bg text-plan-premium border border-transparent',
  },
  admin: {
    label: 'Administrateur',
    classes: 'bg-status-actif-bg text-status-actif border border-transparent',
  },
  assistant: {
    label: 'Assistant',
    classes: 'bg-status-essai-bg text-status-essai border border-transparent',
  },
};

export default function Sidebar({ onClose }: SidebarProps) {
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estSuperAdmin = utilisateur?.role === 'superadmin';

  const roleConfig = ROLE_CONFIG[utilisateur?.role ?? ''] ?? {
    label: utilisateur?.role ?? '—',
    classes: 'bg-muted text-muted-foreground border border-transparent',
  };

  const initiales = utilisateur?.nom ? initialesAvatar(utilisateur.nom) : 'U';

  return (
    <aside className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground">
      {/* Logo / branding */}
      <div className="shrink-0 border-b border-sidebar-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              ERP Avocat
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {estSuperAdmin ? 'Pilotage de la plateforme' : 'Espace cabinet'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 px-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/45">
            Navigation
          </p>
        </div>

        <SidebarNav items={estSuperAdmin ? navSuperAdmin : navCabinet} onNavigate={onClose} />
      </div>

      {/* Footer utilisateur */}
      <div className="shrink-0">
        <Separator className="bg-sidebar-border" />

        <div className="p-4">
          <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback
                className={cn(
                  'text-xs font-semibold',
                  estSuperAdmin
                    ? 'bg-plan-premium-bg text-plan-premium'
                    : 'bg-sidebar-primary/20 text-sidebar-primary'
                )}
              >
                {initiales}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {utilisateur?.nom ?? '—'}
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium leading-none',
                    roleConfig.classes
                  )}
                >
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  {roleConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
