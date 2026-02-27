import { AppError } from '../common/errors/app-error';
import { AnalyticsCacheService } from '../sync/analytics-cache.service';
import { ClickhouseService } from '../sync/clickhouse.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

type QueryMock = jest.Mock<Promise<unknown[]>, [string, Record<string, unknown>?]>;

const createClickhouseMock = (): { query: QueryMock } => {
  const query: QueryMock = jest.fn(async (sql: string) => {
    if (sql.includes('count() AS total')) {
      return [{ total: 0 }];
    }

    return [];
  });

  return { query };
};

describe('AnalyticsService', () => {
  let clickhouseMock: { query: QueryMock };
  let analyticsCacheService: jest.Mocked<AnalyticsCacheService>;
  let service: AnalyticsService;

  beforeEach(() => {
    clickhouseMock = createClickhouseMock();
    analyticsCacheService = {
      get: jest.fn(async () => null),
      set: jest.fn(async () => undefined),
      invalidateAll: jest.fn(async () => undefined),
    } as unknown as jest.Mocked<AnalyticsCacheService>;
    service = new AnalyticsService(
      clickhouseMock as unknown as ClickhouseService,
      analyticsCacheService,
    );
  });

  it('returns default pagination for empty query', async () => {
    const result = await service.getUsers({});

    expect(result).toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
  });

  it('uses provided pagination values', async () => {
    const result = await service.getPromocodes({ page: 2, pageSize: 50 });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
  });

  it('throws INVALID_DATE_RANGE when dateFrom is after dateTo', async () => {
    const query: AnalyticsQueryDto = {
      dateFrom: '2026-02-26T00:00:00.000Z',
      dateTo: '2026-02-25T00:00:00.000Z',
    };

    await expect(service.getPromoUsages(query)).rejects.toBeInstanceOf(AppError);
    await expect(service.getPromoUsages(query)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INVALID_DATE_RANGE',
      }),
    });
  });

  it('throws INVALID_FILTERS for invalid filters json', async () => {
    const query: AnalyticsQueryDto = {
      filters: '{not-json}',
    };

    await expect(service.getUsers(query)).rejects.toBeInstanceOf(AppError);
    await expect(service.getUsers(query)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INVALID_FILTERS',
      }),
    });
  });

  it('accepts allow-listed sort fields for each endpoint', async () => {
    await expect(
      service.getUsers({ sortBy: 'totalSpent', sortDir: 'asc' }),
    ).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
    });

    await expect(
      service.getPromocodes({ sortBy: 'revenue', sortDir: 'desc' }),
    ).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
    });

    await expect(
      service.getPromoUsages({ sortBy: 'usedAt', sortDir: 'desc' }),
    ).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
    });
  });

  it('throws INVALID_SORT_FIELD for non allow-listed sort fields', async () => {
    await expect(
      service.getUsers({ sortBy: 'unknownField' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INVALID_SORT_FIELD',
      }),
    });
  });

  it('accepts allow-listed filters for each endpoint', async () => {
    await expect(
      service.getUsers({ filters: JSON.stringify({ email: 'user@example.com', isActive: true }) }),
    ).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
    });

    await expect(
      service.getPromocodes({ filters: JSON.stringify({ code: 'SUMMER', discountPercentMin: 5 }) }),
    ).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
    });

    await expect(
      service.getPromoUsages({ filters: JSON.stringify({ userEmail: 'user@example.com', discountAmountMax: 50 }) }),
    ).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
    });
  });

  it('throws INVALID_FILTER_FIELD for non allow-listed filter fields', async () => {
    await expect(
      service.getUsers({ filters: JSON.stringify({ unknownField: 'x' }) }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INVALID_FILTER_FIELD',
      }),
    });
  });

  it('throws INVALID_FILTER_TYPE when filter value type is wrong', async () => {
    await expect(
      service.getPromocodes({ filters: JSON.stringify({ isActive: 'true' }) }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INVALID_FILTER_TYPE',
      }),
    });
  });

  it('throws INVALID_FILTER_RANGE when min filter is greater than max filter', async () => {
    await expect(
      service.getPromoUsages({
        filters: JSON.stringify({
          discountAmountMin: 100,
          discountAmountMax: 50,
        }),
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INVALID_FILTER_RANGE',
      }),
    });
  });

  it('sends parameterized query params to clickhouse', async () => {
    await service.getUsers({
      sortBy: 'email',
      sortDir: 'asc',
      filters: JSON.stringify({ email: 'alice@example.com' }),
    });

    const dataCall = clickhouseMock.query.mock.calls[0];
    const sql = dataCall?.[0] ?? '';
    const params = dataCall?.[1] ?? {};

    expect(sql).toContain('{filterEmail:String}');
    expect(params).toEqual(
      expect.objectContaining({
        filterEmail: 'alice@example.com',
      }),
    );
  });

  it('returns cached analytics response when cache hit exists', async () => {
    analyticsCacheService.get.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 20,
      total: 123,
    });

    const result = await service.getUsers({});

    expect(result.total).toBe(123);
    expect(clickhouseMock.query).not.toHaveBeenCalled();
  });

  it('stores analytics response in cache on cache miss', async () => {
    analyticsCacheService.get.mockResolvedValueOnce(null);

    await service.getPromocodes({});

    expect(analyticsCacheService.set).toHaveBeenCalled();
  });
});
