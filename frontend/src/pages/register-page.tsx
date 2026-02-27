import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { useNotifications } from '../notifications-context';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function RegisterPage(): JSX.Element {
  const auth = useAuth();
  const notifications = useNotifications();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

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

  const nameError = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Name is required';
    }

    if (trimmed.length < 2) {
      return 'Name must have at least 2 characters';
    }

    return null;
  }, [name]);

  const phoneError = useMemo(() => {
    const trimmed = phone.trim();
    if (!trimmed) {
      return 'Phone is required';
    }

    if (!E164_REGEX.test(trimmed)) {
      return 'Phone must be in E.164 format, e.g. +15550001111';
    }

    return null;
  }, [phone]);

  const passwordError = useMemo(() => {
    if (!password) {
      return 'Password is required';
    }

    if (password.length < 8) {
      return 'Password must have at least 8 characters';
    }

    return null;
  }, [password]);

  const isSubmitDisabled = Boolean(emailError || nameError || phoneError || passwordError || submitting);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (isSubmitDisabled) {
      notifications.notify('warning', 'Please fix form validation errors');
      return;
    }

    setSubmitting(true);
    auth.clearError();

    try {
      await auth.register({
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
        password,
      });
      notifications.notify('success', 'Account created successfully');
      navigate('/dashboard', { replace: true });
    } catch {
      notifications.notify('error', auth.error ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page auth-page">
      <section className="card">
        <h1>Create account</h1>
        <p className="muted">Register to access PromoCode Manager.</p>
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
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              required
            />
            {nameError ? <span className="field-error">{nameError}</span> : null}
          </label>

          <label>
            Phone (E.164)
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+15550001111"
              required
            />
            {phoneError ? <span className="field-error">{phoneError}</span> : null}
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
            {submitting ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p className="muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
