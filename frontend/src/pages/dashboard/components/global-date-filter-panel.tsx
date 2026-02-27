import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { DatePreset } from '../dashboard-models';

type GlobalDateFilterPanelProps = {
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
  dateError: string | null;
  onPresetSelect: (preset: DatePreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onApplyCustomRange: () => void;
};

export function GlobalDateFilterPanel({
  datePreset,
  customFrom,
  customTo,
  dateError,
  onPresetSelect,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustomRange,
}: GlobalDateFilterPanelProps): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Global Date Filter</Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => onPresetSelect('today')}>
            Today
          </Button>
          <Button variant={datePreset === '7d' ? 'contained' : 'outlined'} onClick={() => onPresetSelect('7d')}>
            Last 7 days
          </Button>
          <Button variant={datePreset === '30d' ? 'contained' : 'outlined'} onClick={() => onPresetSelect('30d')}>
            Last 30 days
          </Button>
          <Button variant={datePreset === 'custom' ? 'contained' : 'outlined'} onClick={() => onPresetSelect('custom')}>
            Custom
          </Button>
        </Stack>

        {datePreset === 'custom' ? (
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' } }}>
            <TextField
              label="From"
              type="date"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="To"
              type="date"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button onClick={onApplyCustomRange}>Apply custom range</Button>
          </Box>
        ) : null}

        {dateError ? <Alert severity="error">{dateError}</Alert> : null}
      </Stack>
    </Paper>
  );
}
