import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { useNotifications } from '../notifications-context';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeNextPath = (raw: string | null): string => {
  if (!raw) {
    return '/dashboard';
  }

  return raw.startsWith('/') ? raw : '/dashboard';
};

export function LoginPage(): JSX.Element {
  const auth = useAuth();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const nextPath = useMemo(
    () => safeNextPath(new URLSearchParams(location.search).get('next')),
    [location.search],
  );

  const emailError = useMemo(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      return 'Email is required';
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      return 'Email format is invalid';
    }

    return null;
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) {
      return 'Password is required';
    }

    if (password.length < 8) {
      return 'Password must have at least 8 characters';
    }

    return null;
  }, [password]);

  const isSubmitDisabled = Boolean(emailError || passwordError || submitting);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (isSubmitDisabled) {
      notifications.notify('warning', 'Please fix form validation errors');
      return;
    }

    setSubmitting(true);
    auth.clearError();

    try {
      await auth.login({ email: email.trim(), password });
      notifications.notify('success', 'Signed in successfully');
      navigate(nextPath, { replace: true });
    } catch {
      notifications.notify('error', auth.error ?? 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page auth-page">
      <section className="card">
        <h1>Login</h1>
        <p className="muted">Use your email and password to continue.</p>
        {auth.error ? <p className="error">{auth.error}</p> : null}

        <form onSubmit={handleSubmit} className="form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            {emailError ? <span className="field-error">{emailError}</span> : null}
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            {passwordError ? <span className="field-error">{passwordError}</span> : null}
          </label>

          <button type="submit" disabled={isSubmitDisabled}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="muted">
          No account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
