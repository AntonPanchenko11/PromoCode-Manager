import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import {
  ANALYTICS_STALE_MS,
  buildAnalyticsCacheKey,
  getAnalyticsCacheEntry,
  invalidateAnalyticsCache,
  setAnalyticsCacheEntry,
} from '../lib/analytics-query-cache';
import { analyticsApi, promocodesApi, usersApi } from '../lib/api';
import {
  AnalyticsPromocodesRow,
  AnalyticsPromoUsagesRow,
  AnalyticsUsersRow,
  ApiError,
  PaginatedResponse,
  SortDir,
} from '../types';
import { useNotifications } from '../notifications-context';

type TabKey = 'users' | 'promocodes' | 'promo-usages';
type DatePreset = 'today' | '7d' | '30d' | 'custom';

type DateRange = {
  dateFrom?: string;
  dateTo?: string;
};

type UsersFilters = {
  email: string;
  name: string;
  isActive: 'all' | 'true' | 'false';
};

type PromocodeFilters = {
  code: string;
  isActive: 'all' | 'true' | 'false';
  discountPercentMin: string;
  discountPercentMax: string;
};

type PromoUsageFilters = {
  userEmail: string;
  userName: string;
  promocodeCode: string;
  discountAmountMin: string;
  discountAmountMax: string;
};

type UsersSortKey =
  | 'createdAt'
  | 'email'
  | 'name'
  | 'ordersCount'
  | 'totalSpent'
  | 'totalDiscount'
  | 'usedPromocodesCount';

type PromocodeSortKey =
  | 'createdAt'
  | 'code'
  | 'discountPercent'
  | 'usagesCount'
  | 'revenue'
  | 'uniqueUsers'
  | 'totalDiscount';

type PromoUsageSortKey =
  | 'usedAt'
  | 'discountAmount'
  | 'orderAmount'
  | 'userEmail'
  | 'promocodeCode';

const DEFAULT_PAGE_SIZE = Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE ?? 20);

const USERS_FILTERS_DEFAULT: UsersFilters = {
  email: '',
  name: '',
  isActive: 'all',
};

const PROMOCODE_FILTERS_DEFAULT: PromocodeFilters = {
  code: '',
  isActive: 'all',
  discountPercentMin: '',
  discountPercentMax: '',
};

const USAGE_FILTERS_DEFAULT: PromoUsageFilters = {
  userEmail: '',
  userName: '',
  promocodeCode: '',
  discountAmountMin: '',
  discountAmountMax: '',
};

const emptyPage = <T,>(pageSize: number): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize,
  total: 0,
});

const startOfDayIso = (date: Date): string => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
};

const endOfDayIso = (date: Date): string => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
};

const toDateInputValue = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const parseOptionalNumber = (raw: string): number | undefined => {
  if (!raw.trim()) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return undefined;
  }

  return value;
};

const formatMoney = (value: number): string => value.toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const formatLastUpdated = (timestamp: number | null): string => {
  if (timestamp === null) {
    return 'never';
  }

  return new Date(timestamp).toLocaleTimeString();
};

const sortMark = (column: string, sortBy: string, sortDir: SortDir): string => {
  if (column !== sortBy) {
    return '';
  }

  return sortDir === 'asc' ? ' ▲' : ' ▼';
};

const normalizeApiMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as ApiError).message);
  }

  return 'Unexpected request error';
};

const buildPresetRange = (preset: DatePreset): DateRange => {
  const now = new Date();
  if (preset === 'today') {
    return {
      dateFrom: startOfDayIso(now),
      dateTo: endOfDayIso(now),
    };
  }

  if (preset === '7d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return {
      dateFrom: startOfDayIso(from),
      dateTo: endOfDayIso(now),
    };
  }

  if (preset === '30d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return {
      dateFrom: startOfDayIso(from),
      dateTo: endOfDayIso(now),
    };
  }

  return {};
};

export function DashboardPage(): JSX.Element {
  const auth = useAuth();
  const notifications = useNotifications();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange>(buildPresetRange('30d'));
  const [dateError, setDateError] = useState<string | null>(null);

  const [usersPage, setUsersPage] = useState<number>(1);
  const [usersPageSize, setUsersPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [usersSortBy, setUsersSortBy] = useState<UsersSortKey>('createdAt');
  const [usersSortDir, setUsersSortDir] = useState<SortDir>('desc');
  const [usersDraftFilters, setUsersDraftFilters] = useState<UsersFilters>(USERS_FILTERS_DEFAULT);
  const [usersFilters, setUsersFilters] = useState<UsersFilters>(USERS_FILTERS_DEFAULT);
  const [usersData, setUsersData] = useState<PaginatedResponse<AnalyticsUsersRow>>(emptyPage(DEFAULT_PAGE_SIZE));
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [usersRefreshing, setUsersRefreshing] = useState<boolean>(false);
  const [usersStale, setUsersStale] = useState<boolean>(false);
  const [usersLastUpdatedAt, setUsersLastUpdatedAt] = useState<number | null>(null);
  const [usersRefetchTick, setUsersRefetchTick] = useState<number>(0);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersDeactivationPending, setUsersDeactivationPending] = useState<Record<string, boolean>>({});

  const [promoPage, setPromoPage] = useState<number>(1);
  const [promoPageSize, setPromoPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [promoSortBy, setPromoSortBy] = useState<PromocodeSortKey>('createdAt');
  const [promoSortDir, setPromoSortDir] = useState<SortDir>('desc');
  const [promoDraftFilters, setPromoDraftFilters] = useState<PromocodeFilters>(PROMOCODE_FILTERS_DEFAULT);
  const [promoFilters, setPromoFilters] = useState<PromocodeFilters>(PROMOCODE_FILTERS_DEFAULT);
  const [promoData, setPromoData] = useState<PaginatedResponse<AnalyticsPromocodesRow>>(emptyPage(DEFAULT_PAGE_SIZE));
  const [promoLoading, setPromoLoading] = useState<boolean>(false);
  const [promoRefreshing, setPromoRefreshing] = useState<boolean>(false);
  const [promoStale, setPromoStale] = useState<boolean>(false);
  const [promoLastUpdatedAt, setPromoLastUpdatedAt] = useState<number | null>(null);
  const [promoRefetchTick, setPromoRefetchTick] = useState<number>(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promocodesDeactivationPending, setPromocodesDeactivationPending] = useState<Record<string, boolean>>({});

  const [usagePage, setUsagePage] = useState<number>(1);
  const [usagePageSize, setUsagePageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [usageSortBy, setUsageSortBy] = useState<PromoUsageSortKey>('usedAt');
  const [usageSortDir, setUsageSortDir] = useState<SortDir>('desc');
  const [usageDraftFilters, setUsageDraftFilters] = useState<PromoUsageFilters>(USAGE_FILTERS_DEFAULT);
  const [usageFilters, setUsageFilters] = useState<PromoUsageFilters>(USAGE_FILTERS_DEFAULT);
  const [usageData, setUsageData] = useState<PaginatedResponse<AnalyticsPromoUsagesRow>>(emptyPage(DEFAULT_PAGE_SIZE));
  const [usageLoading, setUsageLoading] = useState<boolean>(false);
  const [usageRefreshing, setUsageRefreshing] = useState<boolean>(false);
  const [usageStale, setUsageStale] = useState<boolean>(false);
  const [usageLastUpdatedAt, setUsageLastUpdatedAt] = useState<number | null>(null);
  const [usageRefetchTick, setUsageRefetchTick] = useState<number>(0);
  const [usageError, setUsageError] = useState<string | null>(null);

  const usersFiltersPayload = useMemo<Record<string, string | boolean>>(() => {
    const payload: Record<string, string | boolean> = {};

    if (usersFilters.email.trim()) {
      payload.email = usersFilters.email.trim();
    }

    if (usersFilters.name.trim()) {
      payload.name = usersFilters.name.trim();
    }

    if (usersFilters.isActive !== 'all') {
      payload.isActive = usersFilters.isActive === 'true';
    }

    return payload;
  }, [usersFilters]);

  const promoFiltersPayload = useMemo<Record<string, string | number | boolean>>(() => {
    const payload: Record<string, string | number | boolean> = {};

    if (promoFilters.code.trim()) {
      payload.code = promoFilters.code.trim();
    }

    if (promoFilters.isActive !== 'all') {
      payload.isActive = promoFilters.isActive === 'true';
    }

    const discountMin = parseOptionalNumber(promoFilters.discountPercentMin);
    const discountMax = parseOptionalNumber(promoFilters.discountPercentMax);
    if (discountMin !== undefined) {
      payload.discountPercentMin = discountMin;
    }

    if (discountMax !== undefined) {
      payload.discountPercentMax = discountMax;
    }

    return payload;
  }, [promoFilters]);

  const usageFiltersPayload = useMemo<Record<string, string | number>>(() => {
    const payload: Record<string, string | number> = {};

    if (usageFilters.userEmail.trim()) {
      payload.userEmail = usageFilters.userEmail.trim();
    }

    if (usageFilters.userName.trim()) {
      payload.userName = usageFilters.userName.trim();
    }

    if (usageFilters.promocodeCode.trim()) {
      payload.promocodeCode = usageFilters.promocodeCode.trim();
    }

    const discountMin = parseOptionalNumber(usageFilters.discountAmountMin);
    const discountMax = parseOptionalNumber(usageFilters.discountAmountMax);
    if (discountMin !== undefined) {
      payload.discountAmountMin = discountMin;
    }

    if (discountMax !== undefined) {
      payload.discountAmountMax = discountMax;
    }

    return payload;
  }, [usageFilters]);

  const usersQuery = useMemo(() => ({
    page: usersPage,
    pageSize: usersPageSize,
    sortBy: usersSortBy,
    sortDir: usersSortDir,
    dateFrom: appliedDateRange.dateFrom,
    dateTo: appliedDateRange.dateTo,
    filters: usersFiltersPayload,
  }), [
    appliedDateRange.dateFrom,
    appliedDateRange.dateTo,
    usersFiltersPayload,
    usersPage,
    usersPageSize,
    usersSortBy,
    usersSortDir,
  ]);

  const promoQuery = useMemo(() => ({
    page: promoPage,
    pageSize: promoPageSize,
    sortBy: promoSortBy,
    sortDir: promoSortDir,
    dateFrom: appliedDateRange.dateFrom,
    dateTo: appliedDateRange.dateTo,
    filters: promoFiltersPayload,
  }), [
    appliedDateRange.dateFrom,
    appliedDateRange.dateTo,
    promoFiltersPayload,
    promoPage,
    promoPageSize,
    promoSortBy,
    promoSortDir,
  ]);

  const usageQuery = useMemo(() => ({
    page: usagePage,
    pageSize: usagePageSize,
    sortBy: usageSortBy,
    sortDir: usageSortDir,
    dateFrom: appliedDateRange.dateFrom,
    dateTo: appliedDateRange.dateTo,
    filters: usageFiltersPayload,
  }), [
    appliedDateRange.dateFrom,
    appliedDateRange.dateTo,
    usageFiltersPayload,
    usagePage,
    usagePageSize,
    usageSortBy,
    usageSortDir,
  ]);

  const usersCacheKey = useMemo(
    () => buildAnalyticsCacheKey('users', usersQuery),
    [usersQuery],
  );
  const promoCacheKey = useMemo(
    () => buildAnalyticsCacheKey('promocodes', promoQuery),
    [promoQuery],
  );
  const usageCacheKey = useMemo(
    () => buildAnalyticsCacheKey('promo-usages', usageQuery),
    [usageQuery],
  );

  const refetchUsers = (): void => {
    invalidateAnalyticsCache('users');
    setUsersRefetchTick((value) => value + 1);
  };

  const refetchPromocodes = (): void => {
    invalidateAnalyticsCache('promocodes');
    setPromoRefetchTick((value) => value + 1);
  };

  const refetchPromoUsages = (): void => {
    invalidateAnalyticsCache('promo-usages');
    setUsageRefetchTick((value) => value + 1);
  };

  const deactivateUser = async (userId: string): Promise<void> => {
    if (usersDeactivationPending[userId]) {
      return;
    }

    let previousStatus: boolean | null = null;
    setUsersData((current) => ({
      ...current,
      items: current.items.map((row) => {
        if (row.userId !== userId) {
          return row;
        }

        previousStatus = row.isActive;
        return {
          ...row,
          isActive: false,
        };
      }),
    }));
    setUsersDeactivationPending((current) => ({
      ...current,
      [userId]: true,
    }));

    try {
      await usersApi.deactivate(userId);
      notifications.notify('success', 'User deactivated');
      refetchUsers();
      refetchPromocodes();
      refetchPromoUsages();
    } catch (error) {
      const message = normalizeApiMessage(error);
      if (previousStatus !== null) {
        setUsersData((current) => ({
          ...current,
          items: current.items.map((row) => {
            if (row.userId !== userId) {
              return row;
            }

            return {
              ...row,
              isActive: previousStatus ?? row.isActive,
            };
          }),
        }));
      }
      notifications.notify('error', `User deactivation failed: ${message}`);
    } finally {
      setUsersDeactivationPending((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
    }
  };

  const deactivatePromocode = async (promocodeId: string): Promise<void> => {
    if (promocodesDeactivationPending[promocodeId]) {
      return;
    }

    let previousStatus: boolean | null = null;
    setPromoData((current) => ({
      ...current,
      items: current.items.map((row) => {
        if (row.promocodeId !== promocodeId) {
          return row;
        }

        previousStatus = row.isActive;
        return {
          ...row,
          isActive: false,
        };
      }),
    }));
    setPromocodesDeactivationPending((current) => ({
      ...current,
      [promocodeId]: true,
    }));

    try {
      await promocodesApi.deactivate(promocodeId);
      notifications.notify('success', 'Promocode deactivated');
      refetchUsers();
      refetchPromocodes();
      refetchPromoUsages();
    } catch (error) {
      const message = normalizeApiMessage(error);
      if (previousStatus !== null) {
        setPromoData((current) => ({
          ...current,
          items: current.items.map((row) => {
            if (row.promocodeId !== promocodeId) {
              return row;
            }

            return {
              ...row,
              isActive: previousStatus ?? row.isActive,
            };
          }),
        }));
      }
      notifications.notify('error', `Promocode deactivation failed: ${message}`);
    } finally {
      setPromocodesDeactivationPending((current) => {
        const next = { ...current };
        delete next[promocodeId];
        return next;
      });
    }
  };

  const handleLogout = async (): Promise<void> => {
    await auth.logout();
    navigate('/login', { replace: true });
  };

  const applyDatePreset = (preset: DatePreset): void => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const nextRange = buildPresetRange(preset);
      setAppliedDateRange(nextRange);
      setCustomFrom(nextRange.dateFrom ? toDateInputValue(nextRange.dateFrom) : '');
      setCustomTo(nextRange.dateTo ? toDateInputValue(nextRange.dateTo) : '');
      setDateError(null);
      setUsersPage(1);
      setPromoPage(1);
      setUsagePage(1);
    }
  };

  const applyCustomDateRange = (): void => {
    if (datePreset !== 'custom') {
      return;
    }

    if (!customFrom || !customTo) {
      setDateError('Both custom dates are required');
      notifications.notify('warning', 'Set both custom dates');
      return;
    }

    const fromDate = new Date(customFrom);
    const toDate = new Date(customTo);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setDateError('Custom date value is invalid');
      notifications.notify('warning', 'Custom date value is invalid');
      return;
    }

    if (fromDate.getTime() > toDate.getTime()) {
      setDateError('dateFrom must be before dateTo');
      notifications.notify('warning', 'dateFrom must be before dateTo');
      return;
    }

    setDateError(null);
    setAppliedDateRange({
      dateFrom: startOfDayIso(fromDate),
      dateTo: endOfDayIso(toDate),
    });
    setUsersPage(1);
    setPromoPage(1);
    setUsagePage(1);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      const cached = getAnalyticsCacheEntry<PaginatedResponse<AnalyticsUsersRow>>(usersCacheKey);
      const hasCached = cached !== null;
      const stale = cached !== null && Date.now() - cached.updatedAt >= ANALYTICS_STALE_MS;

      if (cached) {
        setUsersData(cached.data);
        setUsersLastUpdatedAt(cached.updatedAt);
        setUsersStale(stale);
        setUsersError(null);
      }

      if (!hasCached) {
        setUsersLoading(true);
        setUsersRefreshing(false);
      } else if (stale) {
        setUsersLoading(false);
        setUsersRefreshing(true);
      } else {
        setUsersLoading(false);
        setUsersRefreshing(false);
        return;
      }

      try {
        const data = await analyticsApi.users(usersQuery);
        if (!cancelled) {
          const entry = setAnalyticsCacheEntry(usersCacheKey, data);
          setUsersData(data);
          setUsersLastUpdatedAt(entry.updatedAt);
          setUsersStale(false);
          setUsersError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message = normalizeApiMessage(error);
          setUsersError(message);
          if (hasCached) {
            setUsersStale(true);
            notifications.notify('warning', `Users refresh failed, showing cached data: ${message}`);
          } else {
            notifications.notify('error', `Users analytics failed: ${message}`);
          }
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
          setUsersRefreshing(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    notifications,
    usersCacheKey,
    usersQuery,
    usersRefetchTick,
  ]);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      const cached = getAnalyticsCacheEntry<PaginatedResponse<AnalyticsPromocodesRow>>(promoCacheKey);
      const hasCached = cached !== null;
      const stale = cached !== null && Date.now() - cached.updatedAt >= ANALYTICS_STALE_MS;

      if (cached) {
        setPromoData(cached.data);
        setPromoLastUpdatedAt(cached.updatedAt);
        setPromoStale(stale);
        setPromoError(null);
      }

      if (!hasCached) {
        setPromoLoading(true);
        setPromoRefreshing(false);
      } else if (stale) {
        setPromoLoading(false);
        setPromoRefreshing(true);
      } else {
        setPromoLoading(false);
        setPromoRefreshing(false);
        return;
      }

      try {
        const data = await analyticsApi.promocodes(promoQuery);
        if (!cancelled) {
          const entry = setAnalyticsCacheEntry(promoCacheKey, data);
          setPromoData(data);
          setPromoLastUpdatedAt(entry.updatedAt);
          setPromoStale(false);
          setPromoError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message = normalizeApiMessage(error);
          setPromoError(message);
          if (hasCached) {
            setPromoStale(true);
            notifications.notify('warning', `Promocodes refresh failed, showing cached data: ${message}`);
          } else {
            notifications.notify('error', `Promocodes analytics failed: ${message}`);
          }
        }
      } finally {
        if (!cancelled) {
          setPromoLoading(false);
          setPromoRefreshing(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    notifications,
    promoCacheKey,
    promoQuery,
    promoRefetchTick,
  ]);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      const cached = getAnalyticsCacheEntry<PaginatedResponse<AnalyticsPromoUsagesRow>>(usageCacheKey);
      const hasCached = cached !== null;
      const stale = cached !== null && Date.now() - cached.updatedAt >= ANALYTICS_STALE_MS;

      if (cached) {
        setUsageData(cached.data);
        setUsageLastUpdatedAt(cached.updatedAt);
        setUsageStale(stale);
        setUsageError(null);
      }

      if (!hasCached) {
        setUsageLoading(true);
        setUsageRefreshing(false);
      } else if (stale) {
        setUsageLoading(false);
        setUsageRefreshing(true);
      } else {
        setUsageLoading(false);
        setUsageRefreshing(false);
        return;
      }

      try {
        const data = await analyticsApi.promoUsages(usageQuery);
        if (!cancelled) {
          const entry = setAnalyticsCacheEntry(usageCacheKey, data);
          setUsageData(data);
          setUsageLastUpdatedAt(entry.updatedAt);
          setUsageStale(false);
          setUsageError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message = normalizeApiMessage(error);
          setUsageError(message);
          if (hasCached) {
            setUsageStale(true);
            notifications.notify('warning', `Promo usage refresh failed, showing cached data: ${message}`);
          } else {
            notifications.notify('error', `Promo usage analytics failed: ${message}`);
          }
        }
      } finally {
        if (!cancelled) {
          setUsageLoading(false);
          setUsageRefreshing(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    notifications,
    usageCacheKey,
    usageQuery,
    usageRefetchTick,
  ]);

  const usersTotalPages = Math.max(1, Math.ceil(usersData.total / usersPageSize));
  const promoTotalPages = Math.max(1, Math.ceil(promoData.total / promoPageSize));
  const usageTotalPages = Math.max(1, Math.ceil(usageData.total / usagePageSize));

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p className="muted">ClickHouse-backed server-side tables for users, promocodes and usage history.</p>
        </div>
        <div className="session-box">
          <p className="muted">
            Signed in as <strong>{auth.user?.email ?? 'unknown user'}</strong>
          </p>
          <button type="button" onClick={() => void handleLogout()}>
            Logout
          </button>
        </div>
      </header>

      <section className="panel">
        <h2>Global Date Filter</h2>
        <div className="preset-row">
          <button
            type="button"
            className={datePreset === 'today' ? 'active-preset' : ''}
            onClick={() => applyDatePreset('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={datePreset === '7d' ? 'active-preset' : ''}
            onClick={() => applyDatePreset('7d')}
          >
            Last 7 days
          </button>
          <button
            type="button"
            className={datePreset === '30d' ? 'active-preset' : ''}
            onClick={() => applyDatePreset('30d')}
          >
            Last 30 days
          </button>
          <button
            type="button"
            className={datePreset === 'custom' ? 'active-preset' : ''}
            onClick={() => setDatePreset('custom')}
          >
            Custom
          </button>
        </div>

        {datePreset === 'custom' ? (
          <div className="custom-date-row">
            <label>
              From
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </label>
            <button type="button" onClick={applyCustomDateRange}>Apply custom range</button>
          </div>
        ) : null}
        {dateError ? <p className="error">{dateError}</p> : null}
      </section>

      <section className="panel">
        <div className="tabs">
          <button type="button" className={activeTab === 'users' ? 'active-tab' : ''} onClick={() => setActiveTab('users')}>
            Users
          </button>
          <button
            type="button"
            className={activeTab === 'promocodes' ? 'active-tab' : ''}
            onClick={() => setActiveTab('promocodes')}
          >
            Promocodes
          </button>
          <button
            type="button"
            className={activeTab === 'promo-usages' ? 'active-tab' : ''}
            onClick={() => setActiveTab('promo-usages')}
          >
            Promo usages
          </button>
        </div>

        {activeTab === 'users' ? (
          <section className="table-section">
            <h2>Users analytics</h2>
            <div className="table-meta-row">
              <p className="status">
                {usersLoading
                  ? 'Loading users...'
                  : usersRefreshing
                    ? 'Refreshing stale users cache...'
                    : usersStale
                      ? 'Showing stale users cache.'
                      : 'Users data is fresh.'}
                {' '}Last update: {formatLastUpdated(usersLastUpdatedAt)}
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  refetchUsers();
                  notifications.notify('success', 'Users cache invalidated, refresh started');
                }}
                disabled={usersLoading || usersRefreshing}
              >
                Refresh users
              </button>
            </div>
            <div className="filter-grid">
              <label>
                Email
                <input
                  type="text"
                  value={usersDraftFilters.email}
                  onChange={(event) => {
                    setUsersDraftFilters((current) => ({ ...current, email: event.target.value }));
                  }}
                />
              </label>
              <label>
                Name
                <input
                  type="text"
                  value={usersDraftFilters.name}
                  onChange={(event) => {
                    setUsersDraftFilters((current) => ({ ...current, name: event.target.value }));
                  }}
                />
              </label>
              <label>
                Status
                <select
                  value={usersDraftFilters.isActive}
                  onChange={(event) => {
                    setUsersDraftFilters((current) => ({
                      ...current,
                      isActive: event.target.value as UsersFilters['isActive'],
                    }));
                  }}
                >
                  <option value="all">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <div className="filter-actions">
                <button type="button" onClick={() => { setUsersFilters(usersDraftFilters); setUsersPage(1); }}>
                  Apply filters
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setUsersDraftFilters(USERS_FILTERS_DEFAULT);
                    setUsersFilters(USERS_FILTERS_DEFAULT);
                    setUsersPage(1);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {usersError ? <p className="error">{usersError}</p> : null}
            {usersRefreshing ? <p className="status">Background refresh in progress...</p> : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsersSortBy('email');
                      setUsersSortDir(usersSortBy === 'email' && usersSortDir === 'asc' ? 'desc' : 'asc');
                      setUsersPage(1);
                    }}>Email{sortMark('email', usersSortBy, usersSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsersSortBy('name');
                      setUsersSortDir(usersSortBy === 'name' && usersSortDir === 'asc' ? 'desc' : 'asc');
                      setUsersPage(1);
                    }}>Name{sortMark('name', usersSortBy, usersSortDir)}</button></th>
                    <th>Status</th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsersSortBy('ordersCount');
                      setUsersSortDir(usersSortBy === 'ordersCount' && usersSortDir === 'asc' ? 'desc' : 'asc');
                      setUsersPage(1);
                    }}>Orders{sortMark('ordersCount', usersSortBy, usersSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsersSortBy('totalSpent');
                      setUsersSortDir(usersSortBy === 'totalSpent' && usersSortDir === 'asc' ? 'desc' : 'asc');
                      setUsersPage(1);
                    }}>Spent{sortMark('totalSpent', usersSortBy, usersSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsersSortBy('totalDiscount');
                      setUsersSortDir(usersSortBy === 'totalDiscount' && usersSortDir === 'asc' ? 'desc' : 'asc');
                      setUsersPage(1);
                    }}>Discount{sortMark('totalDiscount', usersSortBy, usersSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsersSortBy('usedPromocodesCount');
                      setUsersSortDir(usersSortBy === 'usedPromocodesCount' && usersSortDir === 'asc' ? 'desc' : 'asc');
                      setUsersPage(1);
                    }}>Used promos{sortMark('usedPromocodesCount', usersSortBy, usersSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsersSortBy('createdAt');
                      setUsersSortDir(usersSortBy === 'createdAt' && usersSortDir === 'asc' ? 'desc' : 'asc');
                      setUsersPage(1);
                    }}>Created{sortMark('createdAt', usersSortBy, usersSortDir)}</button></th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.items.map((row) => (
                    <tr key={row.userId}>
                      <td>{row.email}</td>
                      <td>{row.name}</td>
                      <td>{row.isActive ? 'active' : 'inactive'}</td>
                      <td>{row.ordersCount}</td>
                      <td>{formatMoney(row.totalSpent)}</td>
                      <td>{formatMoney(row.totalDiscount)}</td>
                      <td>{row.usedPromocodesCount}</td>
                      <td>{formatDateTime(row.createdAt)}</td>
                      <td>
                        {row.isActive ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              void deactivateUser(row.userId);
                            }}
                            disabled={Boolean(usersDeactivationPending[row.userId])}
                          >
                            {usersDeactivationPending[row.userId] ? 'Deactivating...' : 'Deactivate'}
                          </button>
                        ) : (
                          <span className="muted-inline">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!usersLoading && usersData.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty-cell">No users found for selected filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <span>Total: {usersData.total}</span>
              <label>
                Page size
                <select value={usersPageSize} onChange={(event) => {
                  setUsersPageSize(Number(event.target.value));
                  setUsersPage(1);
                }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <button type="button" disabled={usersPage <= 1} onClick={() => setUsersPage((page) => Math.max(1, page - 1))}>
                Prev
              </button>
              <span>Page {usersPage} / {usersTotalPages}</span>
              <button
                type="button"
                disabled={usersPage >= usersTotalPages}
                onClick={() => setUsersPage((page) => Math.min(usersTotalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === 'promocodes' ? (
          <section className="table-section">
            <h2>Promocodes analytics</h2>
            <div className="table-meta-row">
              <p className="status">
                {promoLoading
                  ? 'Loading promocodes...'
                  : promoRefreshing
                    ? 'Refreshing stale promocodes cache...'
                    : promoStale
                      ? 'Showing stale promocodes cache.'
                      : 'Promocodes data is fresh.'}
                {' '}Last update: {formatLastUpdated(promoLastUpdatedAt)}
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  refetchPromocodes();
                  notifications.notify('success', 'Promocodes cache invalidated, refresh started');
                }}
                disabled={promoLoading || promoRefreshing}
              >
                Refresh promocodes
              </button>
            </div>
            <div className="filter-grid">
              <label>
                Code
                <input
                  type="text"
                  value={promoDraftFilters.code}
                  onChange={(event) => {
                    setPromoDraftFilters((current) => ({ ...current, code: event.target.value }));
                  }}
                />
              </label>
              <label>
                Status
                <select
                  value={promoDraftFilters.isActive}
                  onChange={(event) => {
                    setPromoDraftFilters((current) => ({
                      ...current,
                      isActive: event.target.value as PromocodeFilters['isActive'],
                    }));
                  }}
                >
                  <option value="all">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <label>
                Discount % min
                <input
                  type="number"
                  value={promoDraftFilters.discountPercentMin}
                  onChange={(event) => {
                    setPromoDraftFilters((current) => ({ ...current, discountPercentMin: event.target.value }));
                  }}
                />
              </label>
              <label>
                Discount % max
                <input
                  type="number"
                  value={promoDraftFilters.discountPercentMax}
                  onChange={(event) => {
                    setPromoDraftFilters((current) => ({ ...current, discountPercentMax: event.target.value }));
                  }}
                />
              </label>
              <div className="filter-actions">
                <button type="button" onClick={() => { setPromoFilters(promoDraftFilters); setPromoPage(1); }}>
                  Apply filters
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setPromoDraftFilters(PROMOCODE_FILTERS_DEFAULT);
                    setPromoFilters(PROMOCODE_FILTERS_DEFAULT);
                    setPromoPage(1);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {promoError ? <p className="error">{promoError}</p> : null}
            {promoRefreshing ? <p className="status">Background refresh in progress...</p> : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setPromoSortBy('code');
                      setPromoSortDir(promoSortBy === 'code' && promoSortDir === 'asc' ? 'desc' : 'asc');
                      setPromoPage(1);
                    }}>Code{sortMark('code', promoSortBy, promoSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setPromoSortBy('discountPercent');
                      setPromoSortDir(promoSortBy === 'discountPercent' && promoSortDir === 'asc' ? 'desc' : 'asc');
                      setPromoPage(1);
                    }}>Discount %{sortMark('discountPercent', promoSortBy, promoSortDir)}</button></th>
                    <th>Status</th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setPromoSortBy('usagesCount');
                      setPromoSortDir(promoSortBy === 'usagesCount' && promoSortDir === 'asc' ? 'desc' : 'asc');
                      setPromoPage(1);
                    }}>Usages{sortMark('usagesCount', promoSortBy, promoSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setPromoSortBy('revenue');
                      setPromoSortDir(promoSortBy === 'revenue' && promoSortDir === 'asc' ? 'desc' : 'asc');
                      setPromoPage(1);
                    }}>Revenue{sortMark('revenue', promoSortBy, promoSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setPromoSortBy('uniqueUsers');
                      setPromoSortDir(promoSortBy === 'uniqueUsers' && promoSortDir === 'asc' ? 'desc' : 'asc');
                      setPromoPage(1);
                    }}>Unique users{sortMark('uniqueUsers', promoSortBy, promoSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setPromoSortBy('totalDiscount');
                      setPromoSortDir(promoSortBy === 'totalDiscount' && promoSortDir === 'asc' ? 'desc' : 'asc');
                      setPromoPage(1);
                    }}>Discount sum{sortMark('totalDiscount', promoSortBy, promoSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setPromoSortBy('createdAt');
                      setPromoSortDir(promoSortBy === 'createdAt' && promoSortDir === 'asc' ? 'desc' : 'asc');
                      setPromoPage(1);
                    }}>Created{sortMark('createdAt', promoSortBy, promoSortDir)}</button></th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promoData.items.map((row) => (
                    <tr key={row.promocodeId}>
                      <td>{row.code}</td>
                      <td>{row.discountPercent}</td>
                      <td>{row.isActive ? 'active' : 'inactive'}</td>
                      <td>{row.usagesCount}</td>
                      <td>{formatMoney(row.revenue)}</td>
                      <td>{row.uniqueUsers}</td>
                      <td>{formatMoney(row.totalDiscount)}</td>
                      <td>{formatDateTime(row.createdAt)}</td>
                      <td>
                        {row.isActive ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              void deactivatePromocode(row.promocodeId);
                            }}
                            disabled={Boolean(promocodesDeactivationPending[row.promocodeId])}
                          >
                            {promocodesDeactivationPending[row.promocodeId] ? 'Deactivating...' : 'Deactivate'}
                          </button>
                        ) : (
                          <span className="muted-inline">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!promoLoading && promoData.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty-cell">No promocodes found for selected filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <span>Total: {promoData.total}</span>
              <label>
                Page size
                <select value={promoPageSize} onChange={(event) => {
                  setPromoPageSize(Number(event.target.value));
                  setPromoPage(1);
                }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <button type="button" disabled={promoPage <= 1} onClick={() => setPromoPage((page) => Math.max(1, page - 1))}>
                Prev
              </button>
              <span>Page {promoPage} / {promoTotalPages}</span>
              <button
                type="button"
                disabled={promoPage >= promoTotalPages}
                onClick={() => setPromoPage((page) => Math.min(promoTotalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === 'promo-usages' ? (
          <section className="table-section">
            <h2>Promo usage history</h2>
            <div className="table-meta-row">
              <p className="status">
                {usageLoading
                  ? 'Loading usage history...'
                  : usageRefreshing
                    ? 'Refreshing stale usage cache...'
                    : usageStale
                      ? 'Showing stale usage cache.'
                      : 'Promo usage data is fresh.'}
                {' '}Last update: {formatLastUpdated(usageLastUpdatedAt)}
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  refetchPromoUsages();
                  notifications.notify('success', 'Promo usage cache invalidated, refresh started');
                }}
                disabled={usageLoading || usageRefreshing}
              >
                Refresh usages
              </button>
            </div>
            <div className="filter-grid">
              <label>
                User email
                <input
                  type="text"
                  value={usageDraftFilters.userEmail}
                  onChange={(event) => {
                    setUsageDraftFilters((current) => ({ ...current, userEmail: event.target.value }));
                  }}
                />
              </label>
              <label>
                User name
                <input
                  type="text"
                  value={usageDraftFilters.userName}
                  onChange={(event) => {
                    setUsageDraftFilters((current) => ({ ...current, userName: event.target.value }));
                  }}
                />
              </label>
              <label>
                Promocode
                <input
                  type="text"
                  value={usageDraftFilters.promocodeCode}
                  onChange={(event) => {
                    setUsageDraftFilters((current) => ({ ...current, promocodeCode: event.target.value }));
                  }}
                />
              </label>
              <label>
                Discount min
                <input
                  type="number"
                  value={usageDraftFilters.discountAmountMin}
                  onChange={(event) => {
                    setUsageDraftFilters((current) => ({ ...current, discountAmountMin: event.target.value }));
                  }}
                />
              </label>
              <label>
                Discount max
                <input
                  type="number"
                  value={usageDraftFilters.discountAmountMax}
                  onChange={(event) => {
                    setUsageDraftFilters((current) => ({ ...current, discountAmountMax: event.target.value }));
                  }}
                />
              </label>
              <div className="filter-actions">
                <button type="button" onClick={() => { setUsageFilters(usageDraftFilters); setUsagePage(1); }}>
                  Apply filters
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setUsageDraftFilters(USAGE_FILTERS_DEFAULT);
                    setUsageFilters(USAGE_FILTERS_DEFAULT);
                    setUsagePage(1);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {usageError ? <p className="error">{usageError}</p> : null}
            {usageRefreshing ? <p className="status">Background refresh in progress...</p> : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsageSortBy('usedAt');
                      setUsageSortDir(usageSortBy === 'usedAt' && usageSortDir === 'asc' ? 'desc' : 'asc');
                      setUsagePage(1);
                    }}>Used at{sortMark('usedAt', usageSortBy, usageSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsageSortBy('userEmail');
                      setUsageSortDir(usageSortBy === 'userEmail' && usageSortDir === 'asc' ? 'desc' : 'asc');
                      setUsagePage(1);
                    }}>User email{sortMark('userEmail', usageSortBy, usageSortDir)}</button></th>
                    <th>User name</th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsageSortBy('promocodeCode');
                      setUsageSortDir(usageSortBy === 'promocodeCode' && usageSortDir === 'asc' ? 'desc' : 'asc');
                      setUsagePage(1);
                    }}>Promocode{sortMark('promocodeCode', usageSortBy, usageSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsageSortBy('orderAmount');
                      setUsageSortDir(usageSortBy === 'orderAmount' && usageSortDir === 'asc' ? 'desc' : 'asc');
                      setUsagePage(1);
                    }}>Order amount{sortMark('orderAmount', usageSortBy, usageSortDir)}</button></th>
                    <th><button type="button" className="sort-button" onClick={() => {
                      setUsageSortBy('discountAmount');
                      setUsageSortDir(usageSortBy === 'discountAmount' && usageSortDir === 'asc' ? 'desc' : 'asc');
                      setUsagePage(1);
                    }}>Discount amount{sortMark('discountAmount', usageSortBy, usageSortDir)}</button></th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.items.map((row) => (
                    <tr key={row.usageId}>
                      <td>{formatDateTime(row.usedAt)}</td>
                      <td>{row.userEmail}</td>
                      <td>{row.userName}</td>
                      <td>{row.promocodeCode}</td>
                      <td>{formatMoney(row.orderAmount)}</td>
                      <td>{formatMoney(row.discountAmount)}</td>
                    </tr>
                  ))}
                  {!usageLoading && usageData.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">No usage records found for selected filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <span>Total: {usageData.total}</span>
              <label>
                Page size
                <select value={usagePageSize} onChange={(event) => {
                  setUsagePageSize(Number(event.target.value));
                  setUsagePage(1);
                }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <button type="button" disabled={usagePage <= 1} onClick={() => setUsagePage((page) => Math.max(1, page - 1))}>
                Prev
              </button>
              <span>Page {usagePage} / {usageTotalPages}</span>
              <button
                type="button"
                disabled={usagePage >= usageTotalPages}
                onClick={() => setUsagePage((page) => Math.min(usageTotalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
