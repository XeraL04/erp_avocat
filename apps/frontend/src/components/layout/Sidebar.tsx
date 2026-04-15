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
} from 'lucide-react';
import SidebarNav, { type ItemNav } from './SidebarNav';
import { useAuthStore } from '@/stores/auth.store';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  onClose?: () => void;
}

// Navigation Super Admin
const navSuperAdmin: ItemNav[] = [
  {
    label: 'Dashboard',
    href: '/superadmin/dashboard',
    icone: LayoutDashboard,
  },
  {
    label: 'Cabinets',
    href: '/superadmin/tenants',
    icone: Building2,
  },
];

// Navigation Cabinet (admin + assistant)
const navCabinet: ItemNav[] = [
  {
    label: 'Dashboard',
    href: '/cabinet/dashboard',
    icone: LayoutDashboard,
  },
  {
    label: 'Clients',
    href: '/cabinet/clients',
    icone: Users,
  },
  {
    label: 'Dossiers',
    href: '/cabinet/dossiers',
    icone: FolderOpen,
  },
  {
    label: 'Paiements',
    href: '/cabinet/paiements',
    icone: DollarSign,
  },
  {
    label: 'Factures',
    href: '/cabinet/factures',
    icone: FileText,
  },
  {
    label: 'Agenda',
    href: '/cabinet/agenda',
    icone: Calendar,
  },
  {
    label: 'Documents',
    href: '/cabinet/documents',
    icone: Paperclip,
  },
  {
    label: 'Programme',
    href: '/cabinet/programme',
    icone: CalendarClock,
  },
];

/**
 * Sidebar fixe avec logo et navigation selon le rôle.
 */
export default function Sidebar({ onClose }: SidebarProps) {
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estSuperAdmin = utilisateur?.role === 'superadmin';

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar-background border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-sidebar-foreground">ERP Avocat</p>
          <p className="text-xs text-muted-foreground">
            {estSuperAdmin ? 'Super Admin' : 'Cabinet'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav items={estSuperAdmin ? navSuperAdmin : navCabinet} onNavigate={onClose} />
      </div>

      {/* Pied de sidebar — nom du cabinet ou rôle */}
      <Separator />
      <div className="p-4">
        <p className="text-xs text-muted-foreground truncate">{utilisateur?.nom ?? '—'}</p>
        <p className="text-xs text-muted-foreground capitalize">{utilisateur?.role}</p>
      </div>
    </aside>
  );
}
