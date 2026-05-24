import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Paperclip,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import SidebarNav, { type ItemNav } from './SidebarNav';
import { useAuthStore } from '@/stores/auth.store';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { t, i18n } = useTranslation('common');
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estSuperAdmin = utilisateur?.role === 'superadmin';
  const estRTL = i18n.language === 'ar';

  // ── Navigation dynamique (labels traduits) ──────────────────────────────
  const navSuperAdmin: ItemNav[] = [
    { label: t('dashboard'), href: '/superadmin/dashboard', icone: LayoutDashboard },
    { label: t('cabinets'), href: '/superadmin/tenants', icone: Building2 },
  ];

  const navCabinet: ItemNav[] = [
    { label: t('dashboard'), href: '/cabinet/dashboard', icone: LayoutDashboard },
    { label: t('clients'), href: '/cabinet/clients', icone: Users },
    { label: t('dossiers'), href: '/cabinet/dossiers', icone: FolderOpen },
    { label: t('agenda'), href: '/cabinet/agenda', icone: Calendar },
    { label: t('paiements'), href: '/cabinet/paiements', icone: DollarSign },
    { label: t('factures'), href: '/cabinet/factures', icone: FileText },
    { label: t('documents'), href: '/cabinet/documents', icone: Paperclip },
  ];

  // ── Config rôle traduite ────────────────────────────────────────────────
  const ROLE_CONFIG: Record<string, { label: string; classes: string }> = {
    superadmin: {
      label: t('superadmin_label'),
      classes: 'bg-plan-premium-bg text-plan-premium border border-transparent',
    },
    admin: {
      label: estRTL ? 'مدير' : 'Administrateur',
      classes: 'bg-status-actif-bg text-status-actif border border-transparent',
    },
    assistant: {
      label: estRTL ? 'مساعد' : 'Assistant',
      classes: 'bg-status-essai-bg text-status-essai border border-transparent',
    },
  };

  const roleConfig = ROLE_CONFIG[utilisateur?.role ?? ''] ?? {
    label: utilisateur?.role ?? '—',
    classes: 'bg-muted text-muted-foreground border border-transparent',
  };

  // const initiales = utilisateur?.nom ? initialesAvatar(utilisateur.nom) : 'U';

  return (
    <aside
      className={cn(
        'flex h-full w-72 flex-col bg-sidebar-background text-sidebar-foreground',
        estRTL ? 'border-l border-sidebar-border' : 'border-r border-sidebar-border'
      )}
    >
      {/* ── Logo / branding ── */}
      <div className="shrink-0 border-b border-sidebar-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              {t('app_name')}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {estSuperAdmin
                ? estRTL
                  ? 'إدارة المنصة'
                  : 'Pilotage de la plateforme'
                : estRTL
                  ? 'مساحة المكتب'
                  : 'Espace cabinet'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 px-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/45">
            {estRTL ? 'القائمة' : 'Navigation'}
          </p>
        </div>

        <SidebarNav items={estSuperAdmin ? navSuperAdmin : navCabinet} onNavigate={onClose} />
      </div>

      {/* ── Footer utilisateur ── */}
      <div className="shrink-0">
        <Separator className="bg-sidebar-border" />
        <div className="p-4">
          <div className="flex items-center justify-center rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-3">
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
    </aside>
  );
}
