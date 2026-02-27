import { ApiError, PaginatedResponse, SortDir } from '../../types';
import { DatePreset, DateRange } from './dashboard-models';

export const DEFAULT_PAGE_SIZE = Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE ?? 20);

export const emptyPage = <T,>(pageSize: number): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize,
  total: 0,
});

export const startOfDayIso = (date: Date): string => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
};

export const endOfDayIso = (date: Date): string => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
};

export const toDateInputValue = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

export const parseOptionalNumber = (raw: string): number | undefined => {
  if (!raw.trim()) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return undefined;
  }

  return value;
};

export const formatMoney = (value: number): string => value.toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export const formatLastUpdated = (timestamp: number | null): string => {
  if (timestamp === null) {
    return 'never';
  }

  return new Date(timestamp).toLocaleTimeString();
};

export const sortMark = (column: string, sortBy: string, sortDir: SortDir): string => {
  if (column !== sortBy) {
    return '';
  }

  return sortDir === 'asc' ? ' ▲' : ' ▼';
};

export const normalizeApiMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as ApiError).message);
  }

  return 'Unexpected request error';
};

export const buildPresetRange = (preset: DatePreset): DateRange => {
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
