import { HttpStatus, Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { AnalyticsCacheService } from '../sync/analytics-cache.service';
import { ClickhouseService } from '../sync/clickhouse.service';
import { AnalyticsPromocodesRow } from './dto/analytics-promocodes-row.type';
import { AnalyticsPromoUsagesRow } from './dto/analytics-promo-usages-row.type';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsUsersRow } from './dto/analytics-users-row.type';
import { AnalyticsFilterValue, NormalizedAnalyticsQuery } from './dto/normalized-analytics-query.type';
import { PaginatedResponse } from './dto/paginated-response.type';

type ClickhouseParams = Record<string, unknown>;
type FilterFieldType = 'string' | 'number' | 'boolean';
type FilterSchema = Record<string, FilterFieldType>;
type CountRow = { total: number | string };

type UsersRowRaw = {
  userId: string;
  email: string;
  name: string;
  phone: string;
  isActive: number | string;
  ordersCount: number | string;
  totalSpent: number | string;
  totalDiscount: number | string;
  usedPromocodesCount: number | string;
  createdAt: string;
};

type PromocodesRowRaw = {
  promocodeId: string;
  code: string;
  discountPercent: number | string;
  isActive: number | string;
  usageLimitTotal: number | string;
  usageLimitPerUser: number | string;
  usagesCount: number | string;
  revenue: number | string;
  uniqueUsers: number | string;
  totalDiscount: number | string;
  createdAt: string;
};

type PromoUsageRowRaw = {
  usageId: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  promocodeId: string;
  promocodeCode: string;
  orderAmount: number | string;
  discountAmount: number | string;
  usedAt: string;
};

const DEFAULT_ANALYTICS_RANGE_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const USERS_SORT_FIELDS = [
  'createdAt',
  'email',
  'name',
  'ordersCount',
  'totalSpent',
  'totalDiscount',
  'usedPromocodesCount',
] as const;

const USERS_SORT_SQL: Record<(typeof USERS_SORT_FIELDS)[number], string> = {
  createdAt: 'createdAt',
  email: 'email',
  name: 'name',
  ordersCount: 'ordersCount',
  totalSpent: 'totalSpent',
  totalDiscount: 'totalDiscount',
  usedPromocodesCount: 'usedPromocodesCount',
};

const PROMOCODES_SORT_FIELDS = [
  'createdAt',
  'code',
  'discountPercent',
  'usagesCount',
  'revenue',
  'uniqueUsers',
  'totalDiscount',
] as const;

const PROMOCODES_SORT_SQL: Record<(typeof PROMOCODES_SORT_FIELDS)[number], string> = {
  createdAt: 'createdAt',
  code: 'code',
  discountPercent: 'discountPercent',
  usagesCount: 'usagesCount',
  revenue: 'revenue',
  uniqueUsers: 'uniqueUsers',
  totalDiscount: 'totalDiscount',
};

const PROMO_USAGES_SORT_FIELDS = [
  'usedAt',
  'discountAmount',
  'orderAmount',
  'userEmail',
  'promocodeCode',
] as const;

const PROMO_USAGES_SORT_SQL: Record<(typeof PROMO_USAGES_SORT_FIELDS)[number], string> = {
  usedAt: 'usedAt',
  discountAmount: 'discountAmount',
  orderAmount: 'orderAmount',
  userEmail: 'userEmail',
  promocodeCode: 'promocodeCode',
};

const USERS_FILTER_SCHEMA: FilterSchema = {
  email: 'string',
  name: 'string',
  isActive: 'boolean',
};

const PROMOCODES_FILTER_SCHEMA: FilterSchema = {
  code: 'string',
  isActive: 'boolean',
  discountPercentMin: 'number',
  discountPercentMax: 'number',
};

const PROMO_USAGES_FILTER_SCHEMA: FilterSchema = {
  userEmail: 'string',
  userName: 'string',
  promocodeCode: 'string',
  discountAmountMin: 'number',
  discountAmountMax: 'number',
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly clickhouseService: ClickhouseService,
    private readonly analyticsCacheService: AnalyticsCacheService,
  ) {}

  async getUsers(query: AnalyticsQueryDto): Promise<PaginatedResponse<AnalyticsUsersRow>> {
    const normalized = this.normalizeQuery(
      query,
      USERS_SORT_FIELDS,
      'createdAt',
      USERS_FILTER_SCHEMA,
    );
    return this.withCachedResult<AnalyticsUsersRow>(
      'users',
      normalized,
      async () => {
        const whereParams: ClickhouseParams = {};
        const usersWhere = this.buildUsersWhere(normalized.filters, whereParams);
        const ordersDateWhere = this.buildDateRangeWhere(
          'ol.created_at',
          normalized,
          whereParams,
          'orders',
        );
        const usagesDateWhere = this.buildDateRangeWhere(
          'ul.used_at',
          normalized,
          whereParams,
          'usages',
        );

        const sortField = USERS_SORT_SQL[normalized.sortBy as keyof typeof USERS_SORT_SQL];
        const sortDir = normalized.sortDir.toUpperCase();
        const dataParams = this.withPagination(whereParams, normalized.page, normalized.pageSize);

        const dataSql = `
      WITH
        users_latest AS (
          SELECT
            user_id,
            argMax(email, version) AS email,
            argMax(name, version) AS name,
            argMax(phone, version) AS phone,
            argMax(is_active, version) AS is_active,
            argMax(created_at, version) AS created_at
          FROM users
          GROUP BY user_id
        ),
        orders_latest AS (
          SELECT
            order_id,
            argMax(user_id, version) AS user_id,
            argMax(final_amount, version) AS final_amount,
            argMax(discount_amount, version) AS discount_amount,
            argMax(created_at, version) AS created_at
          FROM orders
          GROUP BY order_id
        ),
        orders_agg AS (
          SELECT
            ol.user_id AS user_id,
            count() AS orders_count,
            sum(ol.final_amount) AS total_spent,
            sum(ol.discount_amount) AS total_discount
          FROM orders_latest ol
          WHERE ${ordersDateWhere}
          GROUP BY ol.user_id
        ),
        usages_latest AS (
          SELECT
            usage_id,
            argMax(user_id, version) AS user_id,
            argMax(promocode_id, version) AS promocode_id,
            argMax(used_at, version) AS used_at
          FROM promo_usages
          GROUP BY usage_id
        ),
        usages_agg AS (
          SELECT
            ul.user_id AS user_id,
            uniqExact(ul.promocode_id) AS used_promocodes_count
          FROM usages_latest ul
          WHERE ${usagesDateWhere}
          GROUP BY ul.user_id
        )
      SELECT
        u.user_id AS userId,
        u.email AS email,
        u.name AS name,
        u.phone AS phone,
        toUInt8(u.is_active) AS isActive,
        toUInt64(ifNull(oa.orders_count, 0)) AS ordersCount,
        toFloat64(ifNull(oa.total_spent, 0)) AS totalSpent,
        toFloat64(ifNull(oa.total_discount, 0)) AS totalDiscount,
        toUInt64(ifNull(ua.used_promocodes_count, 0)) AS usedPromocodesCount,
        u.created_at AS createdAt
      FROM users_latest u
      LEFT JOIN orders_agg oa ON u.user_id = oa.user_id
      LEFT JOIN usages_agg ua ON u.user_id = ua.user_id
      WHERE ${usersWhere}
      ORDER BY ${sortField} ${sortDir}
      LIMIT {limit:UInt64} OFFSET {offset:UInt64}
    `;

    const countSql = `
      WITH users_latest AS (
        SELECT
          user_id,
          argMax(email, version) AS email,
          argMax(name, version) AS name,
          argMax(is_active, version) AS is_active
        FROM users
        GROUP BY user_id
      )
      SELECT count() AS total
      FROM users_latest u
      WHERE ${usersWhere}
    `;

        const [rows, total] = await Promise.all([
          this.clickhouseService.query<UsersRowRaw>(dataSql, dataParams),
          this.fetchTotal(countSql, whereParams),
        ]);

        return {
          items: rows.map((row) => this.mapUsersRow(row)),
          page: normalized.page,
          pageSize: normalized.pageSize,
          total,
        };
      },
    );
  }

  async getPromocodes(query: AnalyticsQueryDto): Promise<PaginatedResponse<AnalyticsPromocodesRow>> {
    const normalized = this.normalizeQuery(
      query,
      PROMOCODES_SORT_FIELDS,
      'createdAt',
      PROMOCODES_FILTER_SCHEMA,
      (filters) => this.validateMinMaxRange(filters, 'discountPercentMin', 'discountPercentMax'),
    );
    return this.withCachedResult<AnalyticsPromocodesRow>(
      'promocodes',
      normalized,
      async () => {
        const whereParams: ClickhouseParams = {};
        const promosWhere = this.buildPromocodesWhere(normalized.filters, whereParams);
        const usagesDateWhere = this.buildDateRangeWhere(
          'ul.used_at',
          normalized,
          whereParams,
          'usages',
        );

        const sortField = PROMOCODES_SORT_SQL[normalized.sortBy as keyof typeof PROMOCODES_SORT_SQL];
        const sortDir = normalized.sortDir.toUpperCase();
        const dataParams = this.withPagination(whereParams, normalized.page, normalized.pageSize);

        const dataSql = `
      WITH
        promocodes_latest AS (
          SELECT
            promocode_id,
            argMax(code, version) AS code,
            argMax(discount_percent, version) AS discount_percent,
            argMax(usage_limit_total, version) AS usage_limit_total,
            argMax(usage_limit_per_user, version) AS usage_limit_per_user,
            argMax(is_active, version) AS is_active,
            argMax(created_at, version) AS created_at
          FROM promocodes
          GROUP BY promocode_id
        ),
        usages_latest AS (
          SELECT
            usage_id,
            argMax(promocode_id, version) AS promocode_id,
            argMax(user_id, version) AS user_id,
            argMax(final_amount, version) AS final_amount,
            argMax(discount_amount, version) AS discount_amount,
            argMax(used_at, version) AS used_at
          FROM promo_usages
          GROUP BY usage_id
        ),
        usages_agg AS (
          SELECT
            ul.promocode_id AS promocode_id,
            count() AS usages_count,
            sum(ul.final_amount) AS revenue,
            uniqExact(ul.user_id) AS unique_users,
            sum(ul.discount_amount) AS total_discount
          FROM usages_latest ul
          WHERE ${usagesDateWhere}
          GROUP BY ul.promocode_id
        )
      SELECT
        lp.promocode_id AS promocodeId,
        lp.code AS code,
        toUInt8(lp.discount_percent) AS discountPercent,
        toUInt8(lp.is_active) AS isActive,
        toUInt64(lp.usage_limit_total) AS usageLimitTotal,
        toUInt64(lp.usage_limit_per_user) AS usageLimitPerUser,
        toUInt64(ifNull(ua.usages_count, 0)) AS usagesCount,
        toFloat64(ifNull(ua.revenue, 0)) AS revenue,
        toUInt64(ifNull(ua.unique_users, 0)) AS uniqueUsers,
        toFloat64(ifNull(ua.total_discount, 0)) AS totalDiscount,
        lp.created_at AS createdAt
      FROM promocodes_latest lp
      LEFT JOIN usages_agg ua ON lp.promocode_id = ua.promocode_id
      WHERE ${promosWhere}
      ORDER BY ${sortField} ${sortDir}
      LIMIT {limit:UInt64} OFFSET {offset:UInt64}
    `;

    const countSql = `
      WITH promocodes_latest AS (
        SELECT
          promocode_id,
          argMax(code, version) AS code,
          argMax(discount_percent, version) AS discount_percent,
          argMax(is_active, version) AS is_active
        FROM promocodes
        GROUP BY promocode_id
      )
      SELECT count() AS total
      FROM promocodes_latest lp
      WHERE ${promosWhere}
    `;

        const [rows, total] = await Promise.all([
          this.clickhouseService.query<PromocodesRowRaw>(dataSql, dataParams),
          this.fetchTotal(countSql, whereParams),
        ]);

        return {
          items: rows.map((row) => this.mapPromocodesRow(row)),
          page: normalized.page,
          pageSize: normalized.pageSize,
          total,
        };
      },
    );
  }

  async getPromoUsages(query: AnalyticsQueryDto): Promise<PaginatedResponse<AnalyticsPromoUsagesRow>> {
    const normalized = this.normalizeQuery(
      query,
      PROMO_USAGES_SORT_FIELDS,
      'usedAt',
      PROMO_USAGES_FILTER_SCHEMA,
      (filters) => this.validateMinMaxRange(filters, 'discountAmountMin', 'discountAmountMax'),
    );
    return this.withCachedResult<AnalyticsPromoUsagesRow>(
      'promo-usages',
      normalized,
      async () => {
        const whereParams: ClickhouseParams = {};
        const usagesWhere = this.buildPromoUsagesWhere(normalized, whereParams);
        const sortField = PROMO_USAGES_SORT_SQL[normalized.sortBy as keyof typeof PROMO_USAGES_SORT_SQL];
        const sortDir = normalized.sortDir.toUpperCase();
        const dataParams = this.withPagination(whereParams, normalized.page, normalized.pageSize);

        const dataSql = `
      WITH usages_latest AS (
        SELECT
          usage_id,
          argMax(order_id, version) AS order_id,
          argMax(user_id, version) AS user_id,
          argMax(user_name, version) AS user_name,
          argMax(user_email, version) AS user_email,
          argMax(promocode_id, version) AS promocode_id,
          argMax(promocode_code, version) AS promocode_code,
          argMax(order_amount, version) AS order_amount,
          argMax(discount_amount, version) AS discount_amount,
          argMax(used_at, version) AS used_at
        FROM promo_usages
        GROUP BY usage_id
      )
      SELECT
        pu.usage_id AS usageId,
        pu.order_id AS orderId,
        pu.user_id AS userId,
        pu.user_name AS userName,
        pu.user_email AS userEmail,
        pu.promocode_id AS promocodeId,
        pu.promocode_code AS promocodeCode,
        toFloat64(pu.order_amount) AS orderAmount,
        toFloat64(pu.discount_amount) AS discountAmount,
        pu.used_at AS usedAt
      FROM usages_latest pu
      WHERE ${usagesWhere}
      ORDER BY ${sortField} ${sortDir}
      LIMIT {limit:UInt64} OFFSET {offset:UInt64}
    `;

    const countSql = `
      WITH usages_latest AS (
        SELECT
          usage_id,
          argMax(user_name, version) AS user_name,
          argMax(user_email, version) AS user_email,
          argMax(promocode_code, version) AS promocode_code,
          argMax(discount_amount, version) AS discount_amount,
          argMax(used_at, version) AS used_at
        FROM promo_usages
        GROUP BY usage_id
      )
      SELECT count() AS total
      FROM usages_latest pu
      WHERE ${usagesWhere}
    `;

        const [rows, total] = await Promise.all([
          this.clickhouseService.query<PromoUsageRowRaw>(dataSql, dataParams),
          this.fetchTotal(countSql, whereParams),
        ]);

        return {
          items: rows.map((row) => this.mapPromoUsageRow(row)),
          page: normalized.page,
          pageSize: normalized.pageSize,
          total,
        };
      },
    );
  }

  private async withCachedResult<TItem>(
    namespace: string,
    normalized: NormalizedAnalyticsQuery,
    fetcher: () => Promise<PaginatedResponse<TItem>>,
  ): Promise<PaginatedResponse<TItem>> {
    const cachePayload = JSON.stringify({
      normalized,
    });
    const cached = await this.analyticsCacheService.get<PaginatedResponse<TItem>>(
      namespace,
      cachePayload,
    );
    if (cached) {
      return cached;
    }

    const fresh = await fetcher();
    await this.analyticsCacheService.set(namespace, cachePayload, fresh);
    return fresh;
  }

  private async fetchTotal(query: string, params: ClickhouseParams): Promise<number> {
    const rows = await this.clickhouseService.query<CountRow>(query, params);
    const total = rows[0]?.total;
    return this.toInteger(total);
  }

  private normalizeQuery(
    query: AnalyticsQueryDto,
    allowedSortFields: readonly string[],
    defaultSortBy: string,
    allowedFilters: FilterSchema,
    filterValidator?: (filters: Record<string, AnalyticsFilterValue>) => void,
  ): NormalizedAnalyticsQuery {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy?.trim() || defaultSortBy;
    const sortDir = query.sortDir ?? 'desc';
    const filters = this.parseFilters(query.filters, allowedFilters);

    if (!allowedSortFields.includes(sortBy)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'INVALID_SORT_FIELD',
        'sortBy contains unsupported field',
        {
          sortBy,
          allowedSortFields,
        },
      );
    }
    filterValidator?.(filters);

    let dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;
    let dateTo = query.dateTo ? new Date(query.dateTo) : null;

    if (!dateFrom && !dateTo) {
      const now = new Date();
      dateTo = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
      dateFrom = new Date(dateTo.getTime() - DEFAULT_ANALYTICS_RANGE_DAYS * DAY_IN_MS);
    }

    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'INVALID_DATE_RANGE',
        'dateFrom must be less than or equal to dateTo',
      );
    }

    return {
      page,
      pageSize,
      sortBy,
      sortDir,
      dateFrom,
      dateTo,
      filters,
    };
  }

  private parseFilters(
    rawFilters: string | undefined,
    allowedFilters: FilterSchema,
  ): Record<string, AnalyticsFilterValue> {
    if (!rawFilters) {
      return {};
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawFilters);
    } catch {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'INVALID_FILTERS',
        'filters must be a valid JSON object',
      );
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'INVALID_FILTERS',
        'filters must be a JSON object',
      );
    }

    const result: Record<string, AnalyticsFilterValue> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const expectedType = allowedFilters[key];
      if (!expectedType) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          'INVALID_FILTER_FIELD',
          'filters contains unsupported field',
          {
            field: key,
            allowedFields: Object.keys(allowedFilters),
          },
        );
      }

      if (expectedType === 'string' && typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          result[key] = trimmed;
        }
        continue;
      }

      if (expectedType === 'number' && typeof value === 'number' && Number.isFinite(value)) {
        result[key] = value;
        continue;
      }

      if (expectedType === 'boolean' && typeof value === 'boolean') {
        result[key] = value;
        continue;
      }

      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'INVALID_FILTER_TYPE',
        'filters field has invalid value type',
        {
          field: key,
          expectedType,
          receivedType: typeof value,
        },
      );
    }

    return result;
  }

  private validateMinMaxRange(
    filters: Record<string, AnalyticsFilterValue>,
    minField: string,
    maxField: string,
  ): void {
    const minValue = filters[minField];
    const maxValue = filters[maxField];

    if (
      typeof minValue === 'number'
      && typeof maxValue === 'number'
      && minValue > maxValue
    ) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'INVALID_FILTER_RANGE',
        `${minField} must be less than or equal to ${maxField}`,
        {
          minField,
          maxField,
          minValue,
          maxValue,
        },
      );
    }
  }

  private buildUsersWhere(
    filters: Record<string, AnalyticsFilterValue>,
    params: ClickhouseParams,
  ): string {
    const conditions: string[] = [];

    if (typeof filters.email === 'string') {
      params.filterEmail = filters.email;
      conditions.push('positionCaseInsensitiveUTF8(u.email, {filterEmail:String}) > 0');
    }

    if (typeof filters.name === 'string') {
      params.filterName = filters.name;
      conditions.push('positionCaseInsensitiveUTF8(u.name, {filterName:String}) > 0');
    }

    if (typeof filters.isActive === 'boolean') {
      params.filterIsActive = filters.isActive ? 1 : 0;
      conditions.push('u.is_active = {filterIsActive:UInt8}');
    }

    return this.joinWhereConditions(conditions);
  }

  private buildPromocodesWhere(
    filters: Record<string, AnalyticsFilterValue>,
    params: ClickhouseParams,
  ): string {
    const conditions: string[] = [];

    if (typeof filters.code === 'string') {
      params.filterCode = filters.code;
      conditions.push('positionCaseInsensitiveUTF8(lp.code, {filterCode:String}) > 0');
    }

    if (typeof filters.isActive === 'boolean') {
      params.filterIsActive = filters.isActive ? 1 : 0;
      conditions.push('lp.is_active = {filterIsActive:UInt8}');
    }

    if (typeof filters.discountPercentMin === 'number') {
      params.filterDiscountPercentMin = filters.discountPercentMin;
      conditions.push('lp.discount_percent >= {filterDiscountPercentMin:Float64}');
    }

    if (typeof filters.discountPercentMax === 'number') {
      params.filterDiscountPercentMax = filters.discountPercentMax;
      conditions.push('lp.discount_percent <= {filterDiscountPercentMax:Float64}');
    }

    return this.joinWhereConditions(conditions);
  }

  private buildPromoUsagesWhere(
    normalized: NormalizedAnalyticsQuery,
    params: ClickhouseParams,
  ): string {
    const conditions: string[] = [];
    const filters = normalized.filters;

    const dateRangeWhere = this.buildDateRangeWhere('pu.used_at', normalized, params, 'usages');
    conditions.push(dateRangeWhere);

    if (typeof filters.userEmail === 'string') {
      params.filterUserEmail = filters.userEmail;
      conditions.push('positionCaseInsensitiveUTF8(pu.user_email, {filterUserEmail:String}) > 0');
    }

    if (typeof filters.userName === 'string') {
      params.filterUserName = filters.userName;
      conditions.push('positionCaseInsensitiveUTF8(pu.user_name, {filterUserName:String}) > 0');
    }

    if (typeof filters.promocodeCode === 'string') {
      params.filterPromocodeCode = filters.promocodeCode;
      conditions.push('positionCaseInsensitiveUTF8(pu.promocode_code, {filterPromocodeCode:String}) > 0');
    }

    if (typeof filters.discountAmountMin === 'number') {
      params.filterDiscountAmountMin = filters.discountAmountMin;
      conditions.push('pu.discount_amount >= {filterDiscountAmountMin:Float64}');
    }

    if (typeof filters.discountAmountMax === 'number') {
      params.filterDiscountAmountMax = filters.discountAmountMax;
      conditions.push('pu.discount_amount <= {filterDiscountAmountMax:Float64}');
    }

    return this.joinWhereConditions(conditions);
  }

  private buildDateRangeWhere(
    fieldSql: string,
    normalized: NormalizedAnalyticsQuery,
    params: ClickhouseParams,
    prefix: string,
  ): string {
    const conditions: string[] = [];

    if (normalized.dateFrom) {
      const key = `${prefix}DateFrom`;
      params[key] = normalized.dateFrom.toISOString();
      conditions.push(`${fieldSql} >= parseDateTime64BestEffort({${key}:String})`);
    }

    if (normalized.dateTo) {
      const key = `${prefix}DateTo`;
      params[key] = normalized.dateTo.toISOString();
      conditions.push(`${fieldSql} <= parseDateTime64BestEffort({${key}:String})`);
    }

    return this.joinWhereConditions(conditions);
  }

  private withPagination(
    params: ClickhouseParams,
    page: number,
    pageSize: number,
  ): ClickhouseParams {
    return {
      ...params,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
  }

  private joinWhereConditions(conditions: string[]): string {
    if (conditions.length === 0) {
      return '1 = 1';
    }

    return conditions.join(' AND ');
  }

  private mapUsersRow(row: UsersRowRaw): AnalyticsUsersRow {
    return {
      userId: row.userId,
      email: row.email,
      name: row.name,
      phone: row.phone,
      isActive: this.toBoolean(row.isActive),
      ordersCount: this.toInteger(row.ordersCount),
      totalSpent: this.toNumber(row.totalSpent),
      totalDiscount: this.toNumber(row.totalDiscount),
      usedPromocodesCount: this.toInteger(row.usedPromocodesCount),
      createdAt: this.toIsoString(row.createdAt),
    };
  }

  private mapPromocodesRow(row: PromocodesRowRaw): AnalyticsPromocodesRow {
    return {
      promocodeId: row.promocodeId,
      code: row.code,
      discountPercent: this.toInteger(row.discountPercent),
      isActive: this.toBoolean(row.isActive),
      usageLimitTotal: this.toInteger(row.usageLimitTotal),
      usageLimitPerUser: this.toInteger(row.usageLimitPerUser),
      usagesCount: this.toInteger(row.usagesCount),
      revenue: this.toNumber(row.revenue),
      uniqueUsers: this.toInteger(row.uniqueUsers),
      totalDiscount: this.toNumber(row.totalDiscount),
      createdAt: this.toIsoString(row.createdAt),
    };
  }

  private mapPromoUsageRow(row: PromoUsageRowRaw): AnalyticsPromoUsagesRow {
    return {
      usageId: row.usageId,
      orderId: row.orderId,
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      promocodeId: row.promocodeId,
      promocodeCode: row.promocodeCode,
      orderAmount: this.toNumber(row.orderAmount),
      discountAmount: this.toNumber(row.discountAmount),
      usedAt: this.toIsoString(row.usedAt),
    };
  }

  private toNumber(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private toInteger(value: number | string | null | undefined): number {
    return Math.trunc(this.toNumber(value));
  }

  private toBoolean(value: number | string | null | undefined): boolean {
    return this.toNumber(value) > 0;
  }

  private toIsoString(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toISOString();
  }
}
