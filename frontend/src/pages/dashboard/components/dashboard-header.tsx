import { Button, Paper, Stack, Typography } from '@mui/material';

type DashboardHeaderProps = {
  userEmail?: string;
  onLogout: () => void;
};

export function DashboardHeader({ userEmail, onLogout }: DashboardHeaderProps): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h4" component="h1">Analytics Dashboard</Typography>
          <Typography color="text.secondary">
            ClickHouse-backed server-side tables for users, promocodes and usage history.
          </Typography>
        </Stack>
        <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
          <Typography color="text.secondary">
            Signed in as <strong>{userEmail ?? 'unknown user'}</strong>
          </Typography>
          <Button onClick={onLogout}>Logout</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
