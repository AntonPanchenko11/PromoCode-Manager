import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
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
import {
  AnalyticsPromocodesRow,
  Order,
  PaginatedResponse,
} from '../../../types';
import { EditPromocodeForm } from '../dashboard-models';
import { formatDateTime, formatMoney } from '../dashboard-utils';

type OperationsPanelProps = {
  promoOptions: AnalyticsPromocodesRow[];
  createPromocodeCode: string;
  createPromocodeDiscountPercent: string;
  createPromocodeUsageLimitTotal: string;
  createPromocodeUsageLimitPerUser: string;
  createPromocodeDateFrom: string;
  createPromocodeDateTo: string;
  createPromocodeSubmitting: boolean;
  onCreatePromocodeCodeChange: (value: string) => void;
  onCreatePromocodeDiscountPercentChange: (value: string) => void;
  onCreatePromocodeUsageLimitTotalChange: (value: string) => void;
  onCreatePromocodeUsageLimitPerUserChange: (value: string) => void;
  onCreatePromocodeDateFromChange: (value: string) => void;
  onCreatePromocodeDateToChange: (value: string) => void;
  onCreatePromocodeSubmit: () => void;
  editPromocodeId: string;
  editPromocodeForm: EditPromocodeForm;
  editPromocodeSubmitting: boolean;
  onEditPromocodeIdChange: (value: string) => void;
  onEditPromocodeFormChange: (patch: Partial<EditPromocodeForm>) => void;
  onEditPromocodeSubmit: () => void;
  createOrderAmount: string;
  createOrderSubmitting: boolean;
  onCreateOrderAmountChange: (value: string) => void;
  onCreateOrderSubmit: () => void;
  onRefreshOrders: () => void;
  myOrdersData: PaginatedResponse<Order>;
  myOrdersLoading: boolean;
  myOrdersError: string | null;
  myOrdersPage: number;
  myOrdersPageSize: number;
  myOrdersTotalPages: number;
  onMyOrdersPageSizeChange: (value: number) => void;
  onMyOrdersPrevPage: () => void;
  onMyOrdersNextPage: () => void;
  applyPromoByOrderId: Record<string, string>;
  applyPromocodeSubmittingByOrderId: Record<string, boolean>;
  onApplyPromoInputChange: (orderId: string, value: string) => void;
  onApplyPromocodeSubmit: (orderId: string) => void;
};

export function OperationsPanel({
  promoOptions,
  createPromocodeCode,
  createPromocodeDiscountPercent,
  createPromocodeUsageLimitTotal,
  createPromocodeUsageLimitPerUser,
  createPromocodeDateFrom,
  createPromocodeDateTo,
  createPromocodeSubmitting,
  onCreatePromocodeCodeChange,
  onCreatePromocodeDiscountPercentChange,
  onCreatePromocodeUsageLimitTotalChange,
  onCreatePromocodeUsageLimitPerUserChange,
  onCreatePromocodeDateFromChange,
  onCreatePromocodeDateToChange,
  onCreatePromocodeSubmit,
  editPromocodeId,
  editPromocodeForm,
  editPromocodeSubmitting,
  onEditPromocodeIdChange,
  onEditPromocodeFormChange,
  onEditPromocodeSubmit,
  createOrderAmount,
  createOrderSubmitting,
  onCreateOrderAmountChange,
  onCreateOrderSubmit,
  onRefreshOrders,
  myOrdersData,
  myOrdersLoading,
  myOrdersError,
  myOrdersPage,
  myOrdersPageSize,
  myOrdersTotalPages,
  onMyOrdersPageSizeChange,
  onMyOrdersPrevPage,
  onMyOrdersNextPage,
  applyPromoByOrderId,
  applyPromocodeSubmittingByOrderId,
  onApplyPromoInputChange,
  onApplyPromocodeSubmit,
}: OperationsPanelProps): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">Operations</Typography>
          <Typography color="text.secondary">
            Create and edit promocodes, create orders, and apply promocodes to your existing orders.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1.5} component="form" onSubmit={(event) => {
                  event.preventDefault();
                  onCreatePromocodeSubmit();
                }}>
                  <Typography variant="subtitle1">Create promocode</Typography>
                  <TextField
                    label="Code"
                    value={createPromocodeCode}
                    onChange={(event) => onCreatePromocodeCodeChange(event.target.value)}
                    placeholder="SUMMER2026"
                    required
                  />
                  <TextField
                    label="Discount percent"
                    type="number"
                    inputProps={{ min: 1, max: 100 }}
                    value={createPromocodeDiscountPercent}
                    onChange={(event) => onCreatePromocodeDiscountPercentChange(event.target.value)}
                    required
                  />
                  <TextField
                    label="Total usage limit"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={createPromocodeUsageLimitTotal}
                    onChange={(event) => onCreatePromocodeUsageLimitTotalChange(event.target.value)}
                    required
                  />
                  <TextField
                    label="Per-user usage limit"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={createPromocodeUsageLimitPerUser}
                    onChange={(event) => onCreatePromocodeUsageLimitPerUserChange(event.target.value)}
                    required
                  />
                  <TextField
                    label="Date from"
                    type="date"
                    value={createPromocodeDateFrom}
                    onChange={(event) => onCreatePromocodeDateFromChange(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Date to"
                    type="date"
                    value={createPromocodeDateTo}
                    onChange={(event) => onCreatePromocodeDateToChange(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button type="submit" disabled={createPromocodeSubmitting}>
                    {createPromocodeSubmitting ? 'Creating...' : 'Create promocode'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1.5} component="form" onSubmit={(event) => {
                  event.preventDefault();
                  onEditPromocodeSubmit();
                }}>
                  <Typography variant="subtitle1">Edit promocode</Typography>
                  <FormControl size="small" required>
                    <InputLabel id="edit-promo-select-label">Select promocode</InputLabel>
                    <Select
                      labelId="edit-promo-select-label"
                      value={editPromocodeId}
                      label="Select promocode"
                      onChange={(event) => onEditPromocodeIdChange(event.target.value)}
                    >
                      <MenuItem value="">Select promocode</MenuItem>
                      {promoOptions.map((promo) => (
                        <MenuItem key={promo.promocodeId} value={promo.promocodeId}>
                          {promo.code} ({promo.promocodeId})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="New code"
                    value={editPromocodeForm.code}
                    onChange={(event) => {
                      onEditPromocodeFormChange({ code: event.target.value });
                    }}
                    placeholder="Leave empty to keep"
                  />
                  <TextField
                    label="New discount percent"
                    type="number"
                    inputProps={{ min: 1, max: 100 }}
                    value={editPromocodeForm.discountPercent}
                    onChange={(event) => {
                      onEditPromocodeFormChange({ discountPercent: event.target.value });
                    }}
                    placeholder="Leave empty to keep"
                  />
                  <TextField
                    label="New total usage limit"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={editPromocodeForm.usageLimitTotal}
                    onChange={(event) => {
                      onEditPromocodeFormChange({ usageLimitTotal: event.target.value });
                    }}
                    placeholder="Leave empty to keep"
                  />
                  <TextField
                    label="New per-user limit"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={editPromocodeForm.usageLimitPerUser}
                    onChange={(event) => {
                      onEditPromocodeFormChange({ usageLimitPerUser: event.target.value });
                    }}
                    placeholder="Leave empty to keep"
                  />
                  <FormControl size="small">
                    <InputLabel id="edit-status-label">Status</InputLabel>
                    <Select
                      labelId="edit-status-label"
                      value={editPromocodeForm.isActive}
                      label="Status"
                      onChange={(event) => {
                        onEditPromocodeFormChange({
                          isActive: event.target.value as EditPromocodeForm['isActive'],
                        });
                      }}
                    >
                      <MenuItem value="keep">Keep current</MenuItem>
                      <MenuItem value="true">Set active</MenuItem>
                      <MenuItem value="false">Set inactive</MenuItem>
                    </Select>
                  </FormControl>
                  <Button type="submit" disabled={editPromocodeSubmitting}>
                    {editPromocodeSubmitting ? 'Updating...' : 'Update promocode'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle1">Orders</Typography>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    component="form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onCreateOrderSubmit();
                    }}
                  >
                    <TextField
                      label="New order amount"
                      type="number"
                      inputProps={{ min: 0.01, step: 0.01 }}
                      value={createOrderAmount}
                      onChange={(event) => onCreateOrderAmountChange(event.target.value)}
                      placeholder="120.50"
                      required
                    />
                    <Button type="submit" disabled={createOrderSubmitting}>
                      {createOrderSubmitting ? 'Creating...' : 'Create order'}
                    </Button>
                    <Button variant="outlined" onClick={onRefreshOrders} disabled={myOrdersLoading}>
                      Refresh orders
                    </Button>
                  </Stack>

                  {myOrdersError ? <Alert severity="error">{myOrdersError}</Alert> : null}

                  <TableContainer>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Order id</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Final amount</TableCell>
                          <TableCell>Promocode</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Apply promocode</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {myOrdersData.items.map((order) => (
                          <TableRow key={order.id} hover>
                            <TableCell>{order.id}</TableCell>
                            <TableCell>{formatMoney(order.amount)}</TableCell>
                            <TableCell>{formatMoney(order.finalAmount)}</TableCell>
                            <TableCell>{order.promocodeCode ?? '-'}</TableCell>
                            <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                            <TableCell>
                              {order.promocodeCode ? (
                                <Typography variant="body2" color="text.secondary">Already applied</Typography>
                              ) : (
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ minWidth: 220 }}>
                                  <TextField
                                    value={applyPromoByOrderId[order.id] ?? ''}
                                    onChange={(event) => {
                                      onApplyPromoInputChange(order.id, event.target.value);
                                    }}
                                    placeholder="SUMMER2026"
                                    size="small"
                                  />
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      onApplyPromocodeSubmit(order.id);
                                    }}
                                    disabled={Boolean(applyPromocodeSubmittingByOrderId[order.id])}
                                  >
                                    {applyPromocodeSubmittingByOrderId[order.id] ? 'Applying...' : 'Apply'}
                                  </Button>
                                </Stack>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!myOrdersLoading && myOrdersData.items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">No orders yet.</TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
                    <Typography>Total: {myOrdersData.total}</Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel id="my-orders-page-size-label">Page size</InputLabel>
                      <Select
                        labelId="my-orders-page-size-label"
                        value={String(myOrdersPageSize)}
                        label="Page size"
                        onChange={(event) => {
                          onMyOrdersPageSizeChange(Number(event.target.value));
                        }}
                      >
                        <MenuItem value="10">10</MenuItem>
                        <MenuItem value="20">20</MenuItem>
                        <MenuItem value="50">50</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant="outlined" disabled={myOrdersPage <= 1} onClick={onMyOrdersPrevPage}>Prev</Button>
                    <Typography>Page {myOrdersPage} / {myOrdersTotalPages}</Typography>
                    <Button variant="outlined" disabled={myOrdersPage >= myOrdersTotalPages} onClick={onMyOrdersNextPage}>Next</Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );
}
