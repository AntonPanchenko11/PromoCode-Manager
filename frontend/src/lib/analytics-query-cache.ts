type CacheEntry<TData> = {
  data: TData;
  updatedAt: number;
};

const analyticsQueryCache = new Map<string, CacheEntry<unknown>>();

export const ANALYTICS_STALE_MS = Number(import.meta.env.VITE_ANALYTICS_STALE_MS ?? 30_000);

export const buildAnalyticsCacheKey = (scope: string, query: Record<string, unknown>): string =>
  `${scope}:${JSON.stringify(query)}`;

export const getAnalyticsCacheEntry = <TData>(key: string): CacheEntry<TData> | null => {
  const entry = analyticsQueryCache.get(key);
  if (!entry) {
    return null;
  }

  return entry as CacheEntry<TData>;
};

export const setAnalyticsCacheEntry = <TData>(key: string, data: TData): CacheEntry<TData> => {
  const entry: CacheEntry<TData> = {
    data,
    updatedAt: Date.now(),
  };

  analyticsQueryCache.set(key, entry as CacheEntry<unknown>);
  return entry;
};

export const invalidateAnalyticsCache = (scope?: string): void => {
  if (!scope) {
    analyticsQueryCache.clear();
    return;
  }

  const prefix = `${scope}:`;
  for (const key of analyticsQueryCache.keys()) {
    if (key.startsWith(prefix)) {
      analyticsQueryCache.delete(key);
    }
  }
};
