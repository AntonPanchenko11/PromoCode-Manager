import { useMemo, useState } from 'react';
import { SortDir } from '../../../types';
import {
  DateRange,
  PromoUsageFilters,
  PromoUsageSortKey,
  USAGE_FILTERS_DEFAULT,
} from '../dashboard-models';
import { DEFAULT_PAGE_SIZE, parseOptionalNumber } from '../dashboard-utils';

export type PromoUsagesAnalyticsQueryState = {
  page: number;
  pageSize: number;
  sortBy: PromoUsageSortKey;
  sortDir: SortDir;
  draftFilters: PromoUsageFilters;
  query: {
    page: number;
    pageSize: number;
    sortBy: PromoUsageSortKey;
    sortDir: SortDir;
    dateFrom?: string;
    dateTo?: string;
    filters: Record<string, string | number>;
  };
  patchDraftFilters: (patch: Partial<PromoUsageFilters>) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  changeSort: (sortBy: PromoUsageSortKey) => void;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSizeAndReset: (pageSize: number) => void;
  resetPage: () => void;
};

export function usePromoUsagesAnalyticsQuery(dateRange: DateRange): PromoUsagesAnalyticsQueryState {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<PromoUsageSortKey>('usedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [draftFilters, setDraftFilters] = useState<PromoUsageFilters>(USAGE_FILTERS_DEFAULT);
  const [filters, setFilters] = useState<PromoUsageFilters>(USAGE_FILTERS_DEFAULT);

  const filtersPayload = useMemo<Record<string, string | number>>(() => {
    const payload: Record<string, string | number> = {};

    if (filters.userEmail.trim()) {
      payload.userEmail = filters.userEmail.trim();
    }

    if (filters.userName.trim()) {
      payload.userName = filters.userName.trim();
    }

    if (filters.promocodeCode.trim()) {
      payload.promocodeCode = filters.promocodeCode.trim();
    }

    const discountMin = parseOptionalNumber(filters.discountAmountMin);
    const discountMax = parseOptionalNumber(filters.discountAmountMax);

    if (discountMin !== undefined) {
      payload.discountAmountMin = discountMin;
    }

    if (discountMax !== undefined) {
      payload.discountAmountMax = discountMax;
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
      setDraftFilters(USAGE_FILTERS_DEFAULT);
      setFilters(USAGE_FILTERS_DEFAULT);
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
