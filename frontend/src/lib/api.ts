import {
  ApplyPromocodeInput,
  AnalyticsPromocodesRow,
  AnalyticsPromoUsagesRow,
  AnalyticsQueryInput,
  AnalyticsUsersRow,
  ApiError,
  AuthResponse,
  CreateOrderInput,
  CreatePromocodeInput,
  Order,
  PaginatedResponse,
  Promocode,
  UpdatePromocodeInput,
  User,
} from '../types';
import { tokenStorage } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

type QueryValue = string | number | boolean | undefined | null;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: Record<string, unknown>;
  auth?: boolean;
  query?: Record<string, QueryValue>;
  retryAfterRefresh?: boolean;
};

let refreshRequest: Promise<boolean> | null = null;
let unauthorizedHandler: (() => void) | null = null;

const parseError = async (response: Response): Promise<ApiError> => {
  try {
    const payload = await response.json() as Partial<ApiError>;
    return {
      statusCode: payload.statusCode ?? response.status,
      code: payload.code,
      message: payload.message ?? `Request failed with status ${response.status}`,
      details: payload.details,
    };
  } catch {
    return {
      statusCode: response.status,
      message: `Request failed with status ${response.status}`,
    };
  }
};

const buildUrl = (path: string, query?: Record<string, QueryValue>): string => {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (!query) {
    return url.toString();
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
};

const shouldTryRefresh = (path: string, options: RequestOptions, statusCode: number): boolean => {
  if (!options.auth || statusCode !== 401 || options.retryAfterRefresh) {
    return false;
  }

  if (path.startsWith('/auth/')) {
    return false;
  }

  return Boolean(tokenStorage.getRefreshToken());
};

const executeRefresh = async (): Promise<boolean> => {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return false;
  }

  const tokens = await response.json() as { accessToken: string; refreshToken: string };
  if (!tokens.accessToken || !tokens.refreshToken) {
    return false;
  }

  tokenStorage.setTokens(tokens);
  return true;
};

const tryRefresh = async (): Promise<boolean> => {
  if (!refreshRequest) {
    refreshRequest = executeRefresh()
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    if (shouldTryRefresh(path, options, response.status)) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return request<T>(path, {
          ...options,
          retryAfterRefresh: true,
        });
      }
    }

    const error = await parseError(response);
    if (response.status === 401 && options.auth) {
      tokenStorage.clear();
      unauthorizedHandler?.();
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
};

const buildAnalyticsQuery = (input: AnalyticsQueryInput): Record<string, QueryValue> => {
  const query: Record<string, QueryValue> = {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortDir: input.sortDir,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };

  if (input.filters && Object.keys(input.filters).length > 0) {
    query.filters = JSON.stringify(input.filters);
  }

  return query;
};

export const setApiUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

export const authApi = {
  register(input: { email: string; password: string; name: string; phone: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', { method: 'POST', body: input });
  },

  login(input: { email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', { method: 'POST', body: input });
  },

  refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  },

  me(): Promise<User> {
    return request<User>('/auth/me', { auth: true });
  },

  logout(): Promise<{ success: true }> {
    return request<{ success: true }>('/auth/logout', { method: 'POST', auth: true });
  },
};

export const analyticsApi = {
  users(query: AnalyticsQueryInput): Promise<PaginatedResponse<AnalyticsUsersRow>> {
    return request<PaginatedResponse<AnalyticsUsersRow>>('/analytics/users', {
      method: 'GET',
      auth: true,
      query: buildAnalyticsQuery(query),
    });
  },

  promocodes(query: AnalyticsQueryInput): Promise<PaginatedResponse<AnalyticsPromocodesRow>> {
    return request<PaginatedResponse<AnalyticsPromocodesRow>>('/analytics/promocodes', {
      method: 'GET',
      auth: true,
      query: buildAnalyticsQuery(query),
    });
  },

  promoUsages(query: AnalyticsQueryInput): Promise<PaginatedResponse<AnalyticsPromoUsagesRow>> {
    return request<PaginatedResponse<AnalyticsPromoUsagesRow>>('/analytics/promo-usages', {
      method: 'GET',
      auth: true,
      query: buildAnalyticsQuery(query),
    });
  },
};

export const usersApi = {
  deactivate(userId: string): Promise<User> {
    return request<User>(`/users/${userId}/deactivate`, {
      method: 'PATCH',
      auth: true,
    });
  },
};

export const promocodesApi = {
  create(input: CreatePromocodeInput): Promise<Promocode> {
    return request<Promocode>('/promocodes', {
      method: 'POST',
      auth: true,
      body: input,
    });
  },

  update(promocodeId: string, input: UpdatePromocodeInput): Promise<Promocode> {
    return request<Promocode>(`/promocodes/${promocodeId}`, {
      method: 'PATCH',
      auth: true,
      body: input as Record<string, unknown>,
    });
  },

  deactivate(promocodeId: string): Promise<Promocode> {
    return request<Promocode>(`/promocodes/${promocodeId}/deactivate`, {
      method: 'PATCH',
      auth: true,
    });
  },
};

export const ordersApi = {
  create(input: CreateOrderInput): Promise<Order> {
    return request<Order>('/orders', {
      method: 'POST',
      auth: true,
      body: input as Record<string, unknown>,
    });
  },

  listMine(page: number, pageSize: number): Promise<PaginatedResponse<Order>> {
    return request<PaginatedResponse<Order>>('/orders/my', {
      method: 'GET',
      auth: true,
      query: {
        page,
        pageSize,
      },
    });
  },

  applyPromocode(orderId: string, input: ApplyPromocodeInput): Promise<Order> {
    return request<Order>(`/orders/${orderId}/apply-promocode`, {
      method: 'POST',
      auth: true,
      body: input as Record<string, unknown>,
    });
  },
};
