import { AnalyticsSortDirection } from './analytics-query.dto';

export type AnalyticsFilterValue = string | number | boolean;

export type NormalizedAnalyticsQuery = {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: AnalyticsSortDirection;
  dateFrom: Date | null;
  dateTo: Date | null;
  filters: Record<string, AnalyticsFilterValue>;
};
