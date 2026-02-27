import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { AnalyticsPromoUsagesRow, PaginatedResponse, SortDir } from '../../../types';
import { PromoUsageFilters, PromoUsageSortKey } from '../dashboard-models';
import {
  formatDateTime,
  formatLastUpdated,
  formatMoney,
  sortMark,
} from '../dashboard-utils';

type PromoUsagesAnalyticsSectionProps = {
  data: PaginatedResponse<AnalyticsPromoUsagesRow>;
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  lastUpdatedAt: number | null;
  error: string | null;
  draftFilters: PromoUsageFilters;
  sortBy: PromoUsageSortKey;
  sortDir: SortDir;
  page: number;
  totalPages: number;
  pageSize: number;
  onDraftFiltersChange: (patch: Partial<PromoUsageFilters>) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onSortChange: (sortBy: PromoUsageSortKey) => void;
  onPageSizeChange: (pageSize: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRefresh: () => void;
};

export function PromoUsagesAnalyticsSection({
  data,
  loading,
  refreshing,
  stale,
  lastUpdatedAt,
  error,
  draftFilters,
  sortBy,
  sortDir,
  page,
  totalPages,
  pageSize,
  onDraftFiltersChange,
  onApplyFilters,
  onResetFilters,
  onSortChange,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
  onRefresh,
}: PromoUsagesAnalyticsSectionProps): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Promo usage history</Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Typography color="text.secondary">
            {loading
              ? 'Loading usage history...'
              : refreshing
                ? 'Refreshing stale usage cache...'
                : stale
                  ? 'Showing stale usage cache.'
                  : 'Promo usage data is fresh.'}
            {' '}Last update: {formatLastUpdated(lastUpdatedAt)}
          </Typography>
          <Button variant="outlined" onClick={onRefresh} disabled={loading || refreshing}>
            Refresh usages
          </Button>
        </Stack>

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(6, minmax(0,1fr))' } }}>
          <TextField
            label="User email"
            value={draftFilters.userEmail}
            onChange={(event) => {
              onDraftFiltersChange({ userEmail: event.target.value });
            }}
          />
          <TextField
            label="User name"
            value={draftFilters.userName}
            onChange={(event) => {
              onDraftFiltersChange({ userName: event.target.value });
            }}
          />
          <TextField
            label="Promocode"
            value={draftFilters.promocodeCode}
            onChange={(event) => {
              onDraftFiltersChange({ promocodeCode: event.target.value });
            }}
          />
          <TextField
            label="Discount min"
            type="number"
            value={draftFilters.discountAmountMin}
            onChange={(event) => {
              onDraftFiltersChange({ discountAmountMin: event.target.value });
            }}
          />
          <TextField
            label="Discount max"
            type="number"
            value={draftFilters.discountAmountMax}
            onChange={(event) => {
              onDraftFiltersChange({ discountAmountMax: event.target.value });
            }}
          />
          <Stack direction="row" spacing={1}>
            <Button onClick={onApplyFilters}>Apply filters</Button>
            <Button variant="outlined" onClick={onResetFilters}>Reset</Button>
          </Stack>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {refreshing ? <Alert severity="info">Background refresh in progress...</Alert> : null}

        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell><Button variant="text" onClick={() => onSortChange('usedAt')}>Used at{sortMark('usedAt', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('userEmail')}>User email{sortMark('userEmail', sortBy, sortDir)}</Button></TableCell>
                <TableCell>User name</TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('promocodeCode')}>Promocode{sortMark('promocodeCode', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('orderAmount')}>Order amount{sortMark('orderAmount', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('discountAmount')}>Discount amount{sortMark('discountAmount', sortBy, sortDir)}</Button></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.usageId} hover>
                  <TableCell>{formatDateTime(row.usedAt)}</TableCell>
                  <TableCell>{row.userEmail}</TableCell>
                  <TableCell>{row.userName}</TableCell>
                  <TableCell>{row.promocodeCode}</TableCell>
                  <TableCell>{formatMoney(row.orderAmount)}</TableCell>
                  <TableCell>{formatMoney(row.discountAmount)}</TableCell>
                </TableRow>
              ))}
              {!loading && data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">No usage records found for selected filters.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Typography>Total: {data.total}</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="usage-page-size-label">Page size</InputLabel>
            <Select
              labelId="usage-page-size-label"
              value={String(pageSize)}
              label="Page size"
              onChange={(event) => {
                onPageSizeChange(Number(event.target.value));
              }}
            >
              <MenuItem value="10">10</MenuItem>
              <MenuItem value="20">20</MenuItem>
              <MenuItem value="50">50</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" disabled={page <= 1} onClick={onPrevPage}>Prev</Button>
          <Typography>Page {page} / {totalPages}</Typography>
          <Button variant="outlined" disabled={page >= totalPages} onClick={onNextPage}>Next</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
