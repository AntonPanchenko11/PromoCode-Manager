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
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
      <Paper elevation={3} sx={{ width: '100%', p: 4 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Create account
            </Typography>
            <Typography color="text.secondary">Register to access PromoCode Manager.</Typography>
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
                label="Name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                error={Boolean(nameError)}
                helperText={nameError ?? ' '}
                fullWidth
              />

              <TextField
                label="Phone (E.164)"
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+15550001111"
                required
                error={Boolean(phoneError)}
                helperText={phoneError ?? ' '}
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
                {submitting ? 'Creating...' : 'Create account'}
              </Button>
            </Stack>
          </Box>

          <Typography color="text.secondary">
            Already registered?{' '}
            <MuiLink component={Link} to="/login" underline="hover">
              Sign in
            </MuiLink>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
