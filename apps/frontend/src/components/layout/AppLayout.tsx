import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

// Carte des titres de pages selon la route
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

/**
 * Layout principal : sidebar fixe + header + contenu scrollable.
 * Utilisé par toutes les routes authentifiées.
 */
export default function AppLayout() {
  const location = useLocation();

  // Chercher le titre correspondant à la route courante
  const titre =
    Object.entries(TITRES_PAGES).find(([route]) => location.pathname.startsWith(route))?.[1] ??
    'ERP Avocat';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar fixe — caché sur mobile */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      {/* Zone principale */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header titre={titre} />

        {/* Contenu scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
