import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildAnalyticsCacheKey,
  getAnalyticsCacheEntry,
  invalidateAnalyticsCache,
  setAnalyticsCacheEntry,
} from '../../../lib/analytics-query-cache';
import { normalizeApiMessage } from '../dashboard-utils';

type UseCachedAnalyticsTableParams<TItem, TQuery extends Record<string, unknown>> = {
  scope: string;
  query: TQuery;
  fetcher: (query: TQuery) => Promise<TItem>;
  staleMs: number;
  onError?: (message: string, hasCached: boolean) => void;
};

type UseCachedAnalyticsTableResult<TItem> = {
  data: TItem | null;
  setData: React.Dispatch<React.SetStateAction<TItem | null>>;
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  lastUpdatedAt: number | null;
  error: string | null;
  refetch: () => void;
};

export function useCachedAnalyticsTable<TItem, TQuery extends Record<string, unknown>>({
  scope,
  query,
  fetcher,
  staleMs,
  onError,
}: UseCachedAnalyticsTableParams<TItem, TQuery>): UseCachedAnalyticsTableResult<TItem> {
  const cacheKey = useMemo(
    () => buildAnalyticsCacheKey(scope, query),
    [scope, query],
  );

  const [data, setData] = useState<TItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stale, setStale] = useState<boolean>(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState<number>(0);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const refetch = useCallback((): void => {
    invalidateAnalyticsCache(scope);
    setRefetchTick((value) => value + 1);
  }, [scope]);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      const cached = getAnalyticsCacheEntry<TItem>(cacheKey);
      const hasCached = cached !== null;
      const isStale = cached !== null && Date.now() - cached.updatedAt >= staleMs;

      if (cached) {
        setData(cached.data);
        setLastUpdatedAt(cached.updatedAt);
        setStale(isStale);
        setError(null);
      }

      if (!hasCached) {
        setLoading(true);
        setRefreshing(false);
      } else if (isStale) {
        setLoading(false);
        setRefreshing(true);
      } else {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const next = await fetcher(query);
        if (!cancelled) {
          const entry = setAnalyticsCacheEntry(cacheKey, next);
          setData(next);
          setLastUpdatedAt(entry.updatedAt);
          setStale(false);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          const message = normalizeApiMessage(caught);
          setError(message);
          if (hasCached) {
            setStale(true);
          }
          onErrorRef.current?.(message, hasCached);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, fetcher, query, refetchTick, staleMs]);

  return {
    data,
    setData,
    loading,
    refreshing,
    stale,
    lastUpdatedAt,
    error,
    refetch,
  };
}
