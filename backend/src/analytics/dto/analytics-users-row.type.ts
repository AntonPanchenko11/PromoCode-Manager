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
