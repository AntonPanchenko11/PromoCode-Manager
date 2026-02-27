import {
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { ANALYTICS_STALE_MS } from '../lib/analytics-query-cache';
import { analyticsApi } from '../lib/api';
import {
  AnalyticsPromocodesRow,
  AnalyticsPromoUsagesRow,
  AnalyticsUsersRow,
  PaginatedResponse,
} from '../types';
import { useNotifications } from '../notifications-context';
import { DashboardHeader } from './dashboard/components/dashboard-header';
import { GlobalDateFilterPanel } from './dashboard/components/global-date-filter-panel';
import { OperationsPanel } from './dashboard/components/operations-panel';
import { PromocodesAnalyticsSection } from './dashboard/components/promocodes-analytics-section';
import { PromoUsagesAnalyticsSection } from './dashboard/components/promo-usages-analytics-section';
import { UsersAnalyticsSection } from './dashboard/components/users-analytics-section';
import { TabKey } from './dashboard/dashboard-models';
import { DEFAULT_PAGE_SIZE, emptyPage } from './dashboard/dashboard-utils';
import { useCachedAnalyticsTable } from './dashboard/hooks/use-cached-analytics-table';
import { useDashboardOperations } from './dashboard/hooks/use-dashboard-operations';
import { useDateRangeFilter } from './dashboard/hooks/use-date-range-filter';
import { useMyOrdersTable } from './dashboard/hooks/use-my-orders-table';
import { usePromoUsagesAnalyticsQuery } from './dashboard/hooks/use-promo-usages-analytics-query';
import { usePromocodesAnalyticsQuery } from './dashboard/hooks/use-promocodes-analytics-query';
import { useUsersAnalyticsQuery } from './dashboard/hooks/use-users-analytics-query';

export function DashboardPage(): JSX.Element {
  const auth = useAuth();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('users');

  const dateFilter = useDateRangeFilter({
    onWarning: (message) => {
      notifications.notify('warning', message);
    },
  });

  const usersQuery = useUsersAnalyticsQuery(dateFilter.appliedDateRange);
  const promocodesQuery = usePromocodesAnalyticsQuery(dateFilter.appliedDateRange);
  const promoUsagesQuery = usePromoUsagesAnalyticsQuery(dateFilter.appliedDateRange);

  const usersAnalytics = useCachedAnalyticsTable<PaginatedResponse<AnalyticsUsersRow>, typeof usersQuery.query>({
    scope: 'users',
    query: usersQuery.query,
    fetcher: analyticsApi.users,
    staleMs: ANALYTICS_STALE_MS,
    onError: (message, hasCached) => {
      if (hasCached) {
        notifications.notify('warning', `Users refresh failed, showing cached data: ${message}`);
      } else {
        notifications.notify('error', `Users analytics failed: ${message}`);
      }
    },
  });

  const promocodesAnalytics = useCachedAnalyticsTable<
    PaginatedResponse<AnalyticsPromocodesRow>,
    typeof promocodesQuery.query
  >({
    scope: 'promocodes',
    query: promocodesQuery.query,
    fetcher: analyticsApi.promocodes,
    staleMs: ANALYTICS_STALE_MS,
    onError: (message, hasCached) => {
      if (hasCached) {
        notifications.notify('warning', `Promocodes refresh failed, showing cached data: ${message}`);
      } else {
        notifications.notify('error', `Promocodes analytics failed: ${message}`);
      }
    },
  });

  const promoUsagesAnalytics = useCachedAnalyticsTable<
    PaginatedResponse<AnalyticsPromoUsagesRow>,
    typeof promoUsagesQuery.query
  >({
    scope: 'promo-usages',
    query: promoUsagesQuery.query,
    fetcher: analyticsApi.promoUsages,
    staleMs: ANALYTICS_STALE_MS,
    onError: (message, hasCached) => {
      if (hasCached) {
        notifications.notify('warning', `Promo usage refresh failed, showing cached data: ${message}`);
      } else {
        notifications.notify('error', `Promo usage analytics failed: ${message}`);
      }
    },
  });

  const myOrdersTable = useMyOrdersTable({
    onError: (message) => {
      notifications.notify('error', `Failed to load your orders: ${message}`);
    },
  });

  const operations = useDashboardOperations({
    notifications,
    setUsersData: usersAnalytics.setData,
    setPromocodesData: promocodesAnalytics.setData,
    refetchUsers: usersAnalytics.refetch,
    refetchPromocodes: promocodesAnalytics.refetch,
    refetchPromoUsages: promoUsagesAnalytics.refetch,
    refetchMyOrders: myOrdersTable.refetch,
  });

  const usersData = usersAnalytics.data ?? emptyPage<AnalyticsUsersRow>(DEFAULT_PAGE_SIZE);
  const promocodesData = promocodesAnalytics.data ?? emptyPage<AnalyticsPromocodesRow>(DEFAULT_PAGE_SIZE);
  const promoUsagesData = promoUsagesAnalytics.data ?? emptyPage<AnalyticsPromoUsagesRow>(DEFAULT_PAGE_SIZE);

  const usersTotalPages = useMemo(
    () => Math.max(1, Math.ceil(usersData.total / usersQuery.pageSize)),
    [usersData.total, usersQuery.pageSize],
  );

  const promocodesTotalPages = useMemo(
    () => Math.max(1, Math.ceil(promocodesData.total / promocodesQuery.pageSize)),
    [promocodesData.total, promocodesQuery.pageSize],
  );

  const promoUsagesTotalPages = useMemo(
    () => Math.max(1, Math.ceil(promoUsagesData.total / promoUsagesQuery.pageSize)),
    [promoUsagesData.total, promoUsagesQuery.pageSize],
  );

  const resetAnalyticsPages = (): void => {
    usersQuery.resetPage();
    promocodesQuery.resetPage();
    promoUsagesQuery.resetPage();
  };

  const handleLogout = async (): Promise<void> => {
    await auth.logout();
    navigate('/login', { replace: true });
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        py: 3,
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.default} 32%, ${theme.palette.background.default} 100%)`,
      }}
    >
      <Stack spacing={2}>
        <DashboardHeader
          userEmail={auth.user?.email}
          onLogout={() => {
            void handleLogout();
          }}
        />

        <GlobalDateFilterPanel
          datePreset={dateFilter.datePreset}
          customFrom={dateFilter.customFrom}
          customTo={dateFilter.customTo}
          dateError={dateFilter.dateError}
          onPresetSelect={(preset) => {
            dateFilter.applyPreset(preset);
            if (preset !== 'custom') {
              resetAnalyticsPages();
            }
          }}
          onCustomFromChange={dateFilter.setCustomFrom}
          onCustomToChange={dateFilter.setCustomTo}
          onApplyCustomRange={() => {
            if (dateFilter.applyCustomRange()) {
              resetAnalyticsPages();
            }
          }}
        />

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Analytics Views</Typography>
          <Tabs
            value={activeTab}
            onChange={(_event, value: TabKey) => {
              setActiveTab(value);
            }}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mb: 2 }}
          >
            <Tab label="Users" value="users" />
            <Tab label="Promocodes" value="promocodes" />
            <Tab label="Promo usages" value="promo-usages" />
          </Tabs>

          {activeTab === 'users' ? (
            <UsersAnalyticsSection
              data={usersData}
              loading={usersAnalytics.loading}
              refreshing={usersAnalytics.refreshing}
              stale={usersAnalytics.stale}
              lastUpdatedAt={usersAnalytics.lastUpdatedAt}
              error={usersAnalytics.error}
              draftFilters={usersQuery.draftFilters}
              sortBy={usersQuery.sortBy}
              sortDir={usersQuery.sortDir}
              page={usersQuery.page}
              totalPages={usersTotalPages}
              pageSize={usersQuery.pageSize}
              deactivationPending={operations.usersDeactivationPending}
              onDraftFiltersChange={usersQuery.patchDraftFilters}
              onApplyFilters={usersQuery.applyFilters}
              onResetFilters={usersQuery.resetFilters}
              onSortChange={usersQuery.changeSort}
              onPageSizeChange={usersQuery.setPageSizeAndReset}
              onPrevPage={() => usersQuery.setPage((page) => Math.max(1, page - 1))}
              onNextPage={() => usersQuery.setPage((page) => Math.min(usersTotalPages, page + 1))}
              onRefresh={() => {
                usersAnalytics.refetch();
                notifications.notify('success', 'Users cache invalidated, refresh started');
              }}
              onDeactivateUser={(userId) => {
                void operations.deactivateUser(userId);
              }}
            />
          ) : null}

          {activeTab === 'promocodes' ? (
            <PromocodesAnalyticsSection
              data={promocodesData}
              loading={promocodesAnalytics.loading}
              refreshing={promocodesAnalytics.refreshing}
              stale={promocodesAnalytics.stale}
              lastUpdatedAt={promocodesAnalytics.lastUpdatedAt}
              error={promocodesAnalytics.error}
              draftFilters={promocodesQuery.draftFilters}
              sortBy={promocodesQuery.sortBy}
              sortDir={promocodesQuery.sortDir}
              page={promocodesQuery.page}
              totalPages={promocodesTotalPages}
              pageSize={promocodesQuery.pageSize}
              deactivationPending={operations.promocodesDeactivationPending}
              onDraftFiltersChange={promocodesQuery.patchDraftFilters}
              onApplyFilters={promocodesQuery.applyFilters}
              onResetFilters={promocodesQuery.resetFilters}
              onSortChange={promocodesQuery.changeSort}
              onPageSizeChange={promocodesQuery.setPageSizeAndReset}
              onPrevPage={() => promocodesQuery.setPage((page) => Math.max(1, page - 1))}
              onNextPage={() => promocodesQuery.setPage((page) => Math.min(promocodesTotalPages, page + 1))}
              onRefresh={() => {
                promocodesAnalytics.refetch();
                notifications.notify('success', 'Promocodes cache invalidated, refresh started');
              }}
              onDeactivatePromocode={(promocodeId) => {
                void operations.deactivatePromocode(promocodeId);
              }}
            />
          ) : null}

          {activeTab === 'promo-usages' ? (
            <PromoUsagesAnalyticsSection
              data={promoUsagesData}
              loading={promoUsagesAnalytics.loading}
              refreshing={promoUsagesAnalytics.refreshing}
              stale={promoUsagesAnalytics.stale}
              lastUpdatedAt={promoUsagesAnalytics.lastUpdatedAt}
              error={promoUsagesAnalytics.error}
              draftFilters={promoUsagesQuery.draftFilters}
              sortBy={promoUsagesQuery.sortBy}
              sortDir={promoUsagesQuery.sortDir}
              page={promoUsagesQuery.page}
              totalPages={promoUsagesTotalPages}
              pageSize={promoUsagesQuery.pageSize}
              onDraftFiltersChange={promoUsagesQuery.patchDraftFilters}
              onApplyFilters={promoUsagesQuery.applyFilters}
              onResetFilters={promoUsagesQuery.resetFilters}
              onSortChange={promoUsagesQuery.changeSort}
              onPageSizeChange={promoUsagesQuery.setPageSizeAndReset}
              onPrevPage={() => promoUsagesQuery.setPage((page) => Math.max(1, page - 1))}
              onNextPage={() => promoUsagesQuery.setPage((page) => Math.min(promoUsagesTotalPages, page + 1))}
              onRefresh={() => {
                promoUsagesAnalytics.refetch();
                notifications.notify('success', 'Promo usage cache invalidated, refresh started');
              }}
            />
          ) : null}
        </Paper>

        <OperationsPanel
          promoOptions={promocodesData.items}
          createPromocodeCode={operations.createPromocodeCode}
          createPromocodeDiscountPercent={operations.createPromocodeDiscountPercent}
          createPromocodeUsageLimitTotal={operations.createPromocodeUsageLimitTotal}
          createPromocodeUsageLimitPerUser={operations.createPromocodeUsageLimitPerUser}
          createPromocodeDateFrom={operations.createPromocodeDateFrom}
          createPromocodeDateTo={operations.createPromocodeDateTo}
          createPromocodeSubmitting={operations.createPromocodeSubmitting}
          onCreatePromocodeCodeChange={operations.setCreatePromocodeCode}
          onCreatePromocodeDiscountPercentChange={operations.setCreatePromocodeDiscountPercent}
          onCreatePromocodeUsageLimitTotalChange={operations.setCreatePromocodeUsageLimitTotal}
          onCreatePromocodeUsageLimitPerUserChange={operations.setCreatePromocodeUsageLimitPerUser}
          onCreatePromocodeDateFromChange={operations.setCreatePromocodeDateFrom}
          onCreatePromocodeDateToChange={operations.setCreatePromocodeDateTo}
          onCreatePromocodeSubmit={() => {
            void operations.createPromocode();
          }}
          editPromocodeId={operations.editPromocodeId}
          editPromocodeForm={operations.editPromocodeForm}
          editPromocodeSubmitting={operations.editPromocodeSubmitting}
          onEditPromocodeIdChange={operations.setEditPromocodeId}
          onEditPromocodeFormChange={(patch) => {
            operations.setEditPromocodeForm((current) => ({ ...current, ...patch }));
          }}
          onEditPromocodeSubmit={() => {
            void operations.editPromocode();
          }}
          createOrderAmount={operations.createOrderAmount}
          createOrderSubmitting={operations.createOrderSubmitting}
          onCreateOrderAmountChange={operations.setCreateOrderAmount}
          onCreateOrderSubmit={() => {
            void operations.createOrder();
          }}
          onRefreshOrders={myOrdersTable.refetch}
          myOrdersData={myOrdersTable.data}
          myOrdersLoading={myOrdersTable.loading}
          myOrdersError={myOrdersTable.error}
          myOrdersPage={myOrdersTable.page}
          myOrdersPageSize={myOrdersTable.pageSize}
          myOrdersTotalPages={myOrdersTable.totalPages}
          onMyOrdersPageSizeChange={myOrdersTable.setPageSizeAndReset}
          onMyOrdersPrevPage={myOrdersTable.prevPage}
          onMyOrdersNextPage={myOrdersTable.nextPage}
          applyPromoByOrderId={operations.applyPromoByOrderId}
          applyPromocodeSubmittingByOrderId={operations.applyPromocodeSubmittingByOrderId}
          onApplyPromoInputChange={(orderId, value) => {
            operations.setApplyPromoByOrderId((current) => ({
              ...current,
              [orderId]: value,
            }));
          }}
          onApplyPromocodeSubmit={(orderId) => {
            void operations.applyPromocodeToOrder(orderId);
          }}
        />
      </Stack>
    </Container>
  );
}
