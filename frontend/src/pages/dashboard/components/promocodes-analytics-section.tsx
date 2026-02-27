import {
  Alert,
  Box,
  Button,
  Chip,
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
import { AnalyticsPromocodesRow, PaginatedResponse, SortDir } from '../../../types';
import { PromocodeFilters, PromocodeSortKey } from '../dashboard-models';
import {
  formatDateTime,
  formatLastUpdated,
  formatMoney,
  sortMark,
} from '../dashboard-utils';

type PromocodesAnalyticsSectionProps = {
  data: PaginatedResponse<AnalyticsPromocodesRow>;
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  lastUpdatedAt: number | null;
  error: string | null;
  draftFilters: PromocodeFilters;
  sortBy: PromocodeSortKey;
  sortDir: SortDir;
  page: number;
  totalPages: number;
  pageSize: number;
  deactivationPending: Record<string, boolean>;
  onDraftFiltersChange: (patch: Partial<PromocodeFilters>) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onSortChange: (sortBy: PromocodeSortKey) => void;
  onPageSizeChange: (pageSize: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRefresh: () => void;
  onDeactivatePromocode: (promocodeId: string) => void;
};

export function PromocodesAnalyticsSection({
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
  deactivationPending,
  onDraftFiltersChange,
  onApplyFilters,
  onResetFilters,
  onSortChange,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
  onRefresh,
  onDeactivatePromocode,
}: PromocodesAnalyticsSectionProps): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Promocodes analytics</Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Typography color="text.secondary">
            {loading
              ? 'Loading promocodes...'
              : refreshing
                ? 'Refreshing stale promocodes cache...'
                : stale
                  ? 'Showing stale promocodes cache.'
                  : 'Promocodes data is fresh.'}
            {' '}Last update: {formatLastUpdated(lastUpdatedAt)}
          </Typography>
          <Button variant="outlined" onClick={onRefresh} disabled={loading || refreshing}>
            Refresh promocodes
          </Button>
        </Stack>

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0,1fr))' } }}>
          <TextField
            label="Code"
            value={draftFilters.code}
            onChange={(event) => {
              onDraftFiltersChange({ code: event.target.value });
            }}
          />
          <FormControl size="small">
            <InputLabel id="promos-status-label">Status</InputLabel>
            <Select
              labelId="promos-status-label"
              value={draftFilters.isActive}
              label="Status"
              onChange={(event) => {
                onDraftFiltersChange({ isActive: event.target.value as PromocodeFilters['isActive'] });
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Discount % min"
            type="number"
            value={draftFilters.discountPercentMin}
            onChange={(event) => {
              onDraftFiltersChange({ discountPercentMin: event.target.value });
            }}
          />
          <TextField
            label="Discount % max"
            type="number"
            value={draftFilters.discountPercentMax}
            onChange={(event) => {
              onDraftFiltersChange({ discountPercentMax: event.target.value });
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
                <TableCell><Button variant="text" onClick={() => onSortChange('code')}>Code{sortMark('code', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('discountPercent')}>Discount %{sortMark('discountPercent', sortBy, sortDir)}</Button></TableCell>
                <TableCell>Status</TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('usagesCount')}>Usages{sortMark('usagesCount', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('revenue')}>Revenue{sortMark('revenue', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('uniqueUsers')}>Unique users{sortMark('uniqueUsers', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('totalDiscount')}>Discount sum{sortMark('totalDiscount', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('createdAt')}>Created{sortMark('createdAt', sortBy, sortDir)}</Button></TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.promocodeId} hover>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.discountPercent}</TableCell>
                  <TableCell>
                    <Chip size="small" color={row.isActive ? 'success' : 'default'} label={row.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell>{row.usagesCount}</TableCell>
                  <TableCell>{formatMoney(row.revenue)}</TableCell>
                  <TableCell>{row.uniqueUsers}</TableCell>
                  <TableCell>{formatMoney(row.totalDiscount)}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>
                    {row.isActive ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          onDeactivatePromocode(row.promocodeId);
                        }}
                        disabled={Boolean(deactivationPending[row.promocodeId])}
                      >
                        {deactivationPending[row.promocodeId] ? 'Deactivating...' : 'Deactivate'}
                      </Button>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Inactive</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">No promocodes found for selected filters.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Typography>Total: {data.total}</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="promos-page-size-label">Page size</InputLabel>
            <Select
              labelId="promos-page-size-label"
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
