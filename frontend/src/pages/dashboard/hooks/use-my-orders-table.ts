import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ordersApi } from '../../../lib/api';
import { Order, PaginatedResponse } from '../../../types';
import { emptyPage, normalizeApiMessage } from '../dashboard-utils';

type UseMyOrdersTableParams = {
  onError?: (message: string) => void;
};

type UseMyOrdersTableResult = {
  page: number;
  pageSize: number;
  data: PaginatedResponse<Order>;
  loading: boolean;
  error: string | null;
  totalPages: number;
  refetch: () => void;
  setPageSizeAndReset: (pageSize: number) => void;
  prevPage: () => void;
  nextPage: () => void;
};

export function useMyOrdersTable({ onError }: UseMyOrdersTableParams): UseMyOrdersTableResult {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [data, setData] = useState<PaginatedResponse<Order>>(emptyPage(20));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState<number>(0);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      setLoading(true);
      try {
        const next = await ordersApi.listMine(page, pageSize);
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          const message = normalizeApiMessage(caught);
          setError(message);
          onErrorRef.current?.(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, refetchTick]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.total / pageSize)),
    [data.total, pageSize],
  );

  return {
    page,
    pageSize,
    data,
    loading,
    error,
    totalPages,
    refetch: useCallback(() => {
      setRefetchTick((value) => value + 1);
    }, []),
    setPageSizeAndReset: useCallback((nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPage(1);
    }, []),
    prevPage: useCallback(() => {
      setPage((current) => Math.max(1, current - 1));
    }, []),
    nextPage: useCallback(() => {
      setPage((current) => Math.min(totalPages, current + 1));
    }, [totalPages]),
  };
}
