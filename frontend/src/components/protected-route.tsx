import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth-context';

export function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <p className="status">Checking session...</p>;
  }

  if (!auth.isAuthenticated) {
    const nextPath = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  return children;
}
