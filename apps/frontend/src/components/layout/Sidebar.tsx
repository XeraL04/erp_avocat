import { Scale } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  DollarSign,
  FileText,
  Calendar,
  Paperclip,
  CalendarClock,
  Building2,
  ShieldCheck,
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
  { label: 'Paiements', href: '/cabinet/paiements', icone: DollarSign },
  { label: 'Factures', href: '/cabinet/factures', icone: FileText },
  { label: 'Agenda', href: '/cabinet/agenda', icone: Calendar },
  { label: 'Documents', href: '/cabinet/documents', icone: Paperclip },
  { label: 'Programme', href: '/cabinet/programme', icone: CalendarClock },
];

const ROLE_CONFIG: Record<string, { label: string; classes: string }> = {
  superadmin: {
    label: 'Super Admin',
    classes: 'bg-plan-premium-bg text-plan-premium',
  },
  admin: {
    label: 'Administrateur',
    classes: 'bg-status-actif-bg text-status-actif',
  },
  assistant: {
    label: 'Assistant',
    classes: 'bg-status-essai-bg text-status-essai',
  },
};

export default function Sidebar({ onClose }: SidebarProps) {
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estSuperAdmin = utilisateur?.role === 'superadmin';

  const roleConfig = ROLE_CONFIG[utilisateur?.role ?? ''] ?? {
    label: utilisateur?.role ?? '—',
    classes: 'bg-muted text-muted-foreground',
  };

  const initiales = utilisateur?.nom ? initialesAvatar(utilisateur.nom) : 'U';

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar-background border-r border-sidebar-border">
      {/* ── Logo ── */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Scale className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">ERP Avocat</p>
          <p className="text-xs text-sidebar-foreground/50">
            {estSuperAdmin ? 'Plateforme SaaS' : 'Cabinet juridique'}
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav items={estSuperAdmin ? navSuperAdmin : navCabinet} onNavigate={onClose} />
      </div>

      {/* ── Footer utilisateur ── */}
      <Separator className="bg-sidebar-border" />
      <div className="flex items-center gap-3 p-4 shrink-0">
        <Avatar className="h-8 w-8 shrink-0">
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
          <p className="text-xs font-medium text-sidebar-foreground truncate">
            {utilisateur?.nom ?? '—'}
          </p>
          {/* Badge rôle */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-0.5',
              roleConfig.classes
            )}
          >
            <ShieldCheck className="h-2.5 w-2.5" />
            {roleConfig.label}
          </span>
        </div>
      </div>
    </aside>
  );
}
