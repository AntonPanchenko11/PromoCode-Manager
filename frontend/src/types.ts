export type User = {
  id: string;
  email: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = AuthTokens & {
  user: User;
};

export type ApiError = {
  statusCode?: number;
  code?: string;
  message: string;
  details?: Record<string, unknown>;
};

export type SortDir = 'asc' | 'desc';

export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type AnalyticsUsersRow = {
  userId: string;
  email: string;
  name: string;
  phone: string;
  isActive: boolean;
  ordersCount: number;
  totalSpent: number;
  totalDiscount: number;
  usedPromocodesCount: number;
  createdAt: string;
};

export type AnalyticsPromocodesRow = {
  promocodeId: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  usageLimitTotal: number;
  usageLimitPerUser: number;
  usagesCount: number;
  revenue: number;
  uniqueUsers: number;
  totalDiscount: number;
  createdAt: string;
};

export type AnalyticsPromoUsagesRow = {
  usageId: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  promocodeId: string;
  promocodeCode: string;
  orderAmount: number;
  discountAmount: number;
  usedAt: string;
};

export type Promocode = {
  id: string;
  code: string;
  discountPercent: number;
  usageLimitTotal: number;
  usageLimitPerUser: number;
  dateFrom: string | null;
  dateTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  userId: string;
  amount: number;
  promocodeId: string | null;
  promocodeCode: string | null;
  discountAmount: number;
  finalAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreatePromocodeInput = {
  code: string;
  discountPercent: number;
  usageLimitTotal: number;
  usageLimitPerUser: number;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
};

export type UpdatePromocodeInput = {
  code?: string;
  discountPercent?: number;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  isActive?: boolean;
};

export type CreateOrderInput = {
  amount: number;
};

export type ApplyPromocodeInput = {
  code: string;
};

export type AnalyticsQueryInput = {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: SortDir;
  dateFrom?: string;
  dateTo?: string;
  filters?: Record<string, string | number | boolean>;
};
