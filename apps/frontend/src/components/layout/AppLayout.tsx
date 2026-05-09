import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const TITRES_PAGES: Record<string, string> = {
  '/superadmin/dashboard': 'Tableau de bord',
  '/superadmin/tenants': 'Gestion des cabinets',
  '/cabinet/dashboard': 'Tableau de bord',
  '/cabinet/clients': 'Clients',
  '/cabinet/dossiers': 'Dossiers',
  '/cabinet/paiements': 'Paiements',
  '/cabinet/factures': 'Factures',
  '/cabinet/agenda': 'Agenda',
  '/cabinet/documents': 'Documents',
};

export default function AppLayout() {
  const location = useLocation();
  const [sidebarOuvert, setSidebarOuvert] = useState(false);

  const fermerSidebar = () => setSidebarOuvert(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOuvert(false);
  }, [location.pathname]);

  const titre =
    Object.entries(TITRES_PAGES).find(([route]) => location.pathname.startsWith(route))?.[1] ??
    'ERP Avocat';

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden h-screen shrink-0 border-r border-sidebar-border/80 bg-sidebar-background md:flex">
        <Sidebar />
      </aside>

      {/* Overlay mobile */}
      <div
        className={[
          'fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] transition-all duration-200 md:hidden',
          sidebarOuvert ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-hidden="true"
        onClick={fermerSidebar}
      />

      {/* Drawer mobile */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-[88vw] max-w-72 md:hidden',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'border-r border-sidebar-border bg-sidebar-background shadow-2xl',
          sidebarOuvert ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-hidden={!sidebarOuvert}
      >
        <Sidebar onClose={fermerSidebar} />
      </aside>

      {/* Zone principale */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <Header titre={titre} onToggleSidebar={() => setSidebarOuvert((v) => !v)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-400 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
