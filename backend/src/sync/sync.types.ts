export type SyncOutboxEventType =
  | 'users.upsert'
  | 'promocodes.upsert'
  | 'orders.upsert'
  | 'promo_usages.upsert';

export type SyncOutboxStatus = 'pending' | 'processing' | 'completed' | 'dead';

export type UserUpsertPayload = {
  userId: string;
  email: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromocodeUpsertPayload = {
  promocodeId: string;
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

export type OrderUpsertPayload = {
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  promocodeId: string | null;
  promocodeCode: string | null;
  discountAmount: number;
  finalAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type PromoUsageUpsertPayload = {
  usageId: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
  promocodeId: string;
  promocodeCode: string;
  orderAmount: number;
  discountAmount: number;
  finalAmount: number;
  usedAt: string;
  createdAt: string;
};

export type SyncOutboxPayloadByType = {
  'users.upsert': UserUpsertPayload;
  'promocodes.upsert': PromocodeUpsertPayload;
  'orders.upsert': OrderUpsertPayload;
  'promo_usages.upsert': PromoUsageUpsertPayload;
};
