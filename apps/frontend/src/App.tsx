import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { useDirection } from '@/hooks/useDirection';

import AuthGuard from '@/components/guards/AuthGuard';
import RoleGuard from '@/components/guards/RoleGuard';
import AppLayout from '@/components/layout/AppLayout';

import LoginPage from '@/pages/auth/LoginPage';
import SuperAdminDashboardPage from '@/pages/superadmin/DashboardPage';
import CabinetDashboardPage from '@/pages/cabinet/DashboardPage';

import { Toaster } from '@/components/ui/sonner';

import TenantsPage from '@/pages/superadmin/TenantsPage';
import TenantDetailPage from '@/pages/superadmin/TenantDetailPage';

import ClientsPage from './pages/clients/ClientsPage';
import ClientDetailPage from './pages/clients/ClientDetailPage';

import DossiersPage from './pages/dossiers/DossiersPage';
import DossierDetailPage from './pages/dossiers/DossierDetailPage';

import FacturesPage from './pages/facture/FacturePage';
import FactureDetailPage from './pages/facture/FactureDetailPage';

import AgendaPage from './pages/agenda/AgendaPage';

import DocumentsPage from './pages/documents/DocumentsPage';

import EtapesPage from './pages/etapes/EtapesPage';
import PaiementsPage from './pages/paiements/PaiementsPage';
import UtilisateursPage from './pages/utilisateur/UtilisateursPage';

import ProfilePage from './pages/profile/ProfilePage';

export default function App() {
  useDirection();

  return (
    <BrowserRouter>
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={<LoginPage />} />

        {/* Routes protégées — requièrent une auth */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/profil" element={<ProfilePage />} />
            {/* <Route path="/mot-de-passe" element={<MotDePassePage />} /> */}

            {/* Routes Super Admin uniquement */}
            <Route element={<RoleGuard rolesAutorises={['superadmin']} />}>
              <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />
              <Route path="/superadmin/tenants" element={<TenantsPage />} />
              <Route path="/superadmin/tenants/:id" element={<TenantDetailPage />} />
            </Route>

            {/* Routes Cabinet — admin et assistant */}
            <Route element={<RoleGuard rolesAutorises={['admin', 'assistant']} />}>
              <Route path="/cabinet/dashboard" element={<CabinetDashboardPage />} />

              {/* utilisateur */}
              <Route path="/cabinet/utilisateurs" element={<div>{<UtilisateursPage />}</div>} />

              {/* clients */}
              <Route path="/cabinet/clients" element={<div>{<ClientsPage />}</div>} />
              <Route path="/cabinet/clients/:id" element={<div>{<ClientDetailPage />}</div>} />

              {/* dossiers */}
              <Route path="/cabinet/dossiers" element={<div>{<DossiersPage />}</div>} />
              <Route path="/cabinet/dossiers/:id" element={<div>{<DossierDetailPage />}</div>} />

              {/* paiements */}
              <Route path="/cabinet/paiements" element={<div>{<PaiementsPage />}</div>} />

              {/* factures */}
              <Route path="/cabinet/factures" element={<div>{<FacturesPage />}</div>} />
              <Route path="/cabinet/factures/:id" element={<div>{<FactureDetailPage />}</div>} />

              {/* agenda */}
              <Route path="/cabinet/agenda" element={<div>{<AgendaPage />}</div>} />

              {/* documents */}
              <Route path="/cabinet/documents" element={<div>{<DocumentsPage />}</div>} />

              {/* etapes */}
              <Route path="/cabinet/programme" element={<div>{<EtapesPage />}</div>} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  );
}
