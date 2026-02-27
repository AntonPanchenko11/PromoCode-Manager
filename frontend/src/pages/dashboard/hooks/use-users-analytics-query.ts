import { useMemo, useState } from 'react';
import { SortDir } from '../../../types';
import { DateRange, USERS_FILTERS_DEFAULT, UsersFilters, UsersSortKey } from '../dashboard-models';
import { DEFAULT_PAGE_SIZE } from '../dashboard-utils';

export type UsersAnalyticsQueryState = {
  page: number;
  pageSize: number;
  sortBy: UsersSortKey;
  sortDir: SortDir;
  draftFilters: UsersFilters;
  query: {
    page: number;
    pageSize: number;
    sortBy: UsersSortKey;
    sortDir: SortDir;
    dateFrom?: string;
    dateTo?: string;
    filters: Record<string, string | boolean>;
  };
  patchDraftFilters: (patch: Partial<UsersFilters>) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  changeSort: (sortBy: UsersSortKey) => void;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSizeAndReset: (pageSize: number) => void;
  resetPage: () => void;
};

export function useUsersAnalyticsQuery(dateRange: DateRange): UsersAnalyticsQueryState {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<UsersSortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [draftFilters, setDraftFilters] = useState<UsersFilters>(USERS_FILTERS_DEFAULT);
  const [filters, setFilters] = useState<UsersFilters>(USERS_FILTERS_DEFAULT);

  const filtersPayload = useMemo<Record<string, string | boolean>>(() => {
    const payload: Record<string, string | boolean> = {};

    if (filters.email.trim()) {
      payload.email = filters.email.trim();
    }

    if (filters.name.trim()) {
      payload.name = filters.name.trim();
    }

    if (filters.isActive !== 'all') {
      payload.isActive = filters.isActive === 'true';
    }

    return payload;
  }, [filters]);

  const query = useMemo(() => ({
    page,
    pageSize,
    sortBy,
    sortDir,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    filters: filtersPayload,
  }), [dateRange.dateFrom, dateRange.dateTo, filtersPayload, page, pageSize, sortBy, sortDir]);

  return {
    page,
    pageSize,
    sortBy,
    sortDir,
    draftFilters,
    query,
    patchDraftFilters: (patch) => {
      setDraftFilters((current) => ({ ...current, ...patch }));
    },
    applyFilters: () => {
      setFilters(draftFilters);
      setPage(1);
    },
    resetFilters: () => {
      setDraftFilters(USERS_FILTERS_DEFAULT);
      setFilters(USERS_FILTERS_DEFAULT);
      setPage(1);
    },
    changeSort: (nextSortBy) => {
      setSortBy(nextSortBy);
      setSortDir(sortBy === nextSortBy && sortDir === 'asc' ? 'desc' : 'asc');
      setPage(1);
    },
    setPage,
    setPageSizeAndReset: (nextPageSize) => {
      setPageSize(nextPageSize);
      setPage(1);
    },
    resetPage: () => setPage(1),
  };
}
