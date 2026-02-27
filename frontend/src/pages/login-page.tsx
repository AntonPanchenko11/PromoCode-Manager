import {
  Alert,
  Box,
  Button,
  Container,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
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
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
      <Paper elevation={3} sx={{ width: '100%', p: 4 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Login
            </Typography>
            <Typography color="text.secondary">Use your email and password to continue.</Typography>
          </Box>

          {auth.error ? <Alert severity="error">{auth.error}</Alert> : null}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                error={Boolean(emailError)}
                helperText={emailError ?? ' '}
                fullWidth
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                inputProps={{ minLength: 8 }}
                error={Boolean(passwordError)}
                helperText={passwordError ?? ' '}
                fullWidth
              />

              <Button type="submit" disabled={isSubmitDisabled} fullWidth>
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </Stack>
          </Box>

          <Typography color="text.secondary">
            No account?{' '}
            <MuiLink component={Link} to="/register" underline="hover">
              Create one
            </MuiLink>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
