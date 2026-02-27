import { ConfigService } from '@nestjs/config';
import { AnalyticsCacheService } from './analytics-cache.service';
import { RedisService } from './redis.service';

describe('AnalyticsCacheService', () => {
  let redisService: jest.Mocked<RedisService>;
  let configService: jest.Mocked<ConfigService>;
  let service: AnalyticsCacheService;

  beforeEach(() => {
    redisService = {
      get: jest.fn(),
      setNxWithTtl: jest.fn(),
      setWithTtlSeconds: jest.fn(),
      incr: jest.fn(),
      unlockIfOwner: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    configService = {
      get: jest.fn((key: string, fallback?: number) => {
        const values: Record<string, number> = {
          ANALYTICS_CACHE_TTL_SECONDS: 60,
        };
        return values[key] ?? fallback ?? 0;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    service = new AnalyticsCacheService(configService, redisService);
  });

  it('returns parsed value on cache hit', async () => {
    redisService.get
      .mockResolvedValueOnce('3')
      .mockResolvedValueOnce(JSON.stringify({ total: 10 }));

    const value = await service.get<{ total: number }>('users', '{"page":1}');

    expect(value).toEqual({ total: 10 });
  });

  it('stores value in cache with configured ttl', async () => {
    redisService.get.mockResolvedValueOnce('1');
    redisService.setWithTtlSeconds.mockResolvedValueOnce(true);

    await service.set('users', '{"page":1}', { total: 5 });

    expect(redisService.setWithTtlSeconds).toHaveBeenCalledWith(
      expect.stringContaining('analytics:cache:users:v1:'),
      JSON.stringify({ total: 5 }),
      60,
    );
  });

  it('bumps cache version on invalidateAll', async () => {
    redisService.incr.mockResolvedValueOnce(2);

    await service.invalidateAll();

    expect(redisService.incr).toHaveBeenCalledWith('analytics:cache:version');
  });
});
