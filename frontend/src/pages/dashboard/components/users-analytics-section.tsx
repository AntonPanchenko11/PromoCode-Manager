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
import { AnalyticsUsersRow, PaginatedResponse, SortDir } from '../../../types';
import { UsersFilters, UsersSortKey } from '../dashboard-models';
import {
  formatDateTime,
  formatLastUpdated,
  formatMoney,
  sortMark,
} from '../dashboard-utils';

type UsersAnalyticsSectionProps = {
  data: PaginatedResponse<AnalyticsUsersRow>;
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  lastUpdatedAt: number | null;
  error: string | null;
  draftFilters: UsersFilters;
  sortBy: UsersSortKey;
  sortDir: SortDir;
  page: number;
  totalPages: number;
  pageSize: number;
  deactivationPending: Record<string, boolean>;
  onDraftFiltersChange: (patch: Partial<UsersFilters>) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onSortChange: (sortBy: UsersSortKey) => void;
  onPageSizeChange: (pageSize: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRefresh: () => void;
  onDeactivateUser: (userId: string) => void;
};

export function UsersAnalyticsSection({
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
  onDeactivateUser,
}: UsersAnalyticsSectionProps): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Users analytics</Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Typography color="text.secondary">
            {loading
              ? 'Loading users...'
              : refreshing
                ? 'Refreshing stale users cache...'
                : stale
                  ? 'Showing stale users cache.'
                  : 'Users data is fresh.'}
            {' '}Last update: {formatLastUpdated(lastUpdatedAt)}
          </Typography>
          <Button variant="outlined" onClick={onRefresh} disabled={loading || refreshing}>
            Refresh users
          </Button>
        </Stack>

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0,1fr))' } }}>
          <TextField
            label="Email"
            value={draftFilters.email}
            onChange={(event) => {
              onDraftFiltersChange({ email: event.target.value });
            }}
          />
          <TextField
            label="Name"
            value={draftFilters.name}
            onChange={(event) => {
              onDraftFiltersChange({ name: event.target.value });
            }}
          />
          <FormControl size="small">
            <InputLabel id="users-status-label">Status</InputLabel>
            <Select
              labelId="users-status-label"
              value={draftFilters.isActive}
              label="Status"
              onChange={(event) => {
                onDraftFiltersChange({ isActive: event.target.value as UsersFilters['isActive'] });
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
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
                <TableCell><Button variant="text" onClick={() => onSortChange('email')}>Email{sortMark('email', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('name')}>Name{sortMark('name', sortBy, sortDir)}</Button></TableCell>
                <TableCell>Status</TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('ordersCount')}>Orders{sortMark('ordersCount', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('totalSpent')}>Spent{sortMark('totalSpent', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('totalDiscount')}>Discount{sortMark('totalDiscount', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('usedPromocodesCount')}>Used promos{sortMark('usedPromocodesCount', sortBy, sortDir)}</Button></TableCell>
                <TableCell><Button variant="text" onClick={() => onSortChange('createdAt')}>Created{sortMark('createdAt', sortBy, sortDir)}</Button></TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.userId} hover>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Chip size="small" color={row.isActive ? 'success' : 'default'} label={row.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell>{row.ordersCount}</TableCell>
                  <TableCell>{formatMoney(row.totalSpent)}</TableCell>
                  <TableCell>{formatMoney(row.totalDiscount)}</TableCell>
                  <TableCell>{row.usedPromocodesCount}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>
                    {row.isActive ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          onDeactivateUser(row.userId);
                        }}
                        disabled={Boolean(deactivationPending[row.userId])}
                      >
                        {deactivationPending[row.userId] ? 'Deactivating...' : 'Deactivate'}
                      </Button>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Inactive</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">No users found for selected filters.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Typography>Total: {data.total}</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="users-page-size-label">Page size</InputLabel>
            <Select
              labelId="users-page-size-label"
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
