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
