import { useState } from 'react'; // ← plus de useEffect
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

  const titre =
    Object.entries(TITRES_PAGES).find(([route]) => location.pathname.startsWith(route))?.[1] ??
    'ERP Avocat';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      {/* Overlay mobile */}
      {sidebarOuvert && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
          onClick={fermerSidebar}
        />
      )}

      {/* Drawer mobile */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 md:hidden',
          'transition-transform duration-300 ease-in-out',
          sidebarOuvert ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* onClose est appelé par SidebarNav au clic sur un lien */}
        <Sidebar onClose={fermerSidebar} />
      </div>

      {/* Zone principale */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header titre={titre} onToggleSidebar={() => setSidebarOuvert((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
