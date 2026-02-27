import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth-context';
import { ProtectedRoute } from './components/protected-route';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';

function HomeRedirect(): JSX.Element {
  const auth = useAuth();
  if (auth.isLoading) {
    return <p className="status">Loading...</p>;
  }

  return <Navigate to={auth.isAuthenticated ? '/dashboard' : '/login'} replace />;
}

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
