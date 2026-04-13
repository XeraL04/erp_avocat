import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Protège toutes les routes authentifiées.
 * Si non connecté → redirige vers /login en conservant la route cible.
 */
export default function AuthGuard() {
  const estAuthentifie = useAuthStore((s) => s.estAuthentifie);
  const location = useLocation();

  if (!estAuthentifie) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
