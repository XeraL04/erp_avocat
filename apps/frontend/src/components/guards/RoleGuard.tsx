import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types';

interface RoleGuardProps {
  rolesAutorises: Role[];
}

/**
 * Restreint l'accès selon le rôle de l'utilisateur.
 * Utilisé après AuthGuard dans l'arbre de routes.
 */
export default function RoleGuard({ rolesAutorises }: RoleGuardProps) {
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const role = utilisateur?.role;

  if (!role || !rolesAutorises.includes(role)) {
    // Rediriger vers le bon dashboard selon le rôle existant
    const redirection = role === 'superadmin' ? '/superadmin/dashboard' : '/cabinet/dashboard';
    return <Navigate to={redirection} replace />;
  }

  return <Outlet />;
}
