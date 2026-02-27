import { useMemo, useState } from 'react';
import { SortDir } from '../../../types';
import {
  DateRange,
  PROMOCODE_FILTERS_DEFAULT,
  PromocodeFilters,
  PromocodeSortKey,
} from '../dashboard-models';
import { DEFAULT_PAGE_SIZE, parseOptionalNumber } from '../dashboard-utils';

export type PromocodesAnalyticsQueryState = {
  page: number;
  pageSize: number;
  sortBy: PromocodeSortKey;
  sortDir: SortDir;
  draftFilters: PromocodeFilters;
  query: {
    page: number;
    pageSize: number;
    sortBy: PromocodeSortKey;
    sortDir: SortDir;
    dateFrom?: string;
    dateTo?: string;
    filters: Record<string, string | number | boolean>;
  };
  patchDraftFilters: (patch: Partial<PromocodeFilters>) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  changeSort: (sortBy: PromocodeSortKey) => void;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSizeAndReset: (pageSize: number) => void;
  resetPage: () => void;
};

export function usePromocodesAnalyticsQuery(dateRange: DateRange): PromocodesAnalyticsQueryState {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<PromocodeSortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [draftFilters, setDraftFilters] = useState<PromocodeFilters>(PROMOCODE_FILTERS_DEFAULT);
  const [filters, setFilters] = useState<PromocodeFilters>(PROMOCODE_FILTERS_DEFAULT);

  const filtersPayload = useMemo<Record<string, string | number | boolean>>(() => {
    const payload: Record<string, string | number | boolean> = {};

    if (filters.code.trim()) {
      payload.code = filters.code.trim();
    }

    if (filters.isActive !== 'all') {
      payload.isActive = filters.isActive === 'true';
    }

    const discountMin = parseOptionalNumber(filters.discountPercentMin);
    const discountMax = parseOptionalNumber(filters.discountPercentMax);

    if (discountMin !== undefined) {
      payload.discountPercentMin = discountMin;
    }

    if (discountMax !== undefined) {
      payload.discountPercentMax = discountMax;
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
      setDraftFilters(PROMOCODE_FILTERS_DEFAULT);
      setFilters(PROMOCODE_FILTERS_DEFAULT);
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
