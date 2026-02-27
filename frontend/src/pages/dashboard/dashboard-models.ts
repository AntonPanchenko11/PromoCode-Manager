export type TabKey = 'users' | 'promocodes' | 'promo-usages';

export type DatePreset = 'today' | '7d' | '30d' | 'custom';

export type DateRange = {
  dateFrom?: string;
  dateTo?: string;
};

export type UsersFilters = {
  email: string;
  name: string;
  isActive: 'all' | 'true' | 'false';
};

export type PromocodeFilters = {
  code: string;
  isActive: 'all' | 'true' | 'false';
  discountPercentMin: string;
  discountPercentMax: string;
};

export type PromoUsageFilters = {
  userEmail: string;
  userName: string;
  promocodeCode: string;
  discountAmountMin: string;
  discountAmountMax: string;
};

export type UsersSortKey =
  | 'createdAt'
  | 'email'
  | 'name'
  | 'ordersCount'
  | 'totalSpent'
  | 'totalDiscount'
  | 'usedPromocodesCount';

export type PromocodeSortKey =
  | 'createdAt'
  | 'code'
  | 'discountPercent'
  | 'usagesCount'
  | 'revenue'
  | 'uniqueUsers'
  | 'totalDiscount';

export type PromoUsageSortKey =
  | 'usedAt'
  | 'discountAmount'
  | 'orderAmount'
  | 'userEmail'
  | 'promocodeCode';

export type EditPromocodeForm = {
  code: string;
  discountPercent: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  isActive: 'keep' | 'true' | 'false';
};

export const USERS_FILTERS_DEFAULT: UsersFilters = {
  email: '',
  name: '',
  isActive: 'all',
};

export const PROMOCODE_FILTERS_DEFAULT: PromocodeFilters = {
  code: '',
  isActive: 'all',
  discountPercentMin: '',
  discountPercentMax: '',
};

export const USAGE_FILTERS_DEFAULT: PromoUsageFilters = {
  userEmail: '',
  userName: '',
  promocodeCode: '',
  discountAmountMin: '',
  discountAmountMax: '',
};
