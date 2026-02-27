import { ConfigService } from '@nestjs/config';
import { AppError } from '../common/errors/app-error';
import { RedisLockService } from './redis-lock.service';
import { RedisService } from './redis.service';

describe('RedisLockService', () => {
  let redisService: jest.Mocked<RedisService>;
  let configService: jest.Mocked<ConfigService>;
  let service: RedisLockService;

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
          REDIS_LOCK_TTL_MS: 5000,
          REDIS_LOCK_WAIT_TIMEOUT_MS: 2000,
        };

        return values[key] ?? fallback ?? 0;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    service = new RedisLockService(configService, redisService);
  });

  it('acquires lock, runs action, and releases lock', async () => {
    redisService.setNxWithTtl.mockResolvedValue(true);
    redisService.unlockIfOwner.mockResolvedValue(true);

    const result = await service.withLock(
      'lock:test',
      async () => 'ok',
      { ttlMs: 5000, waitTimeoutMs: 100 },
    );

    expect(result).toBe('ok');
    expect(redisService.setNxWithTtl).toHaveBeenCalledWith(
      'lock:test',
      expect.any(String),
      5000,
    );
    expect(redisService.unlockIfOwner).toHaveBeenCalledWith(
      'lock:test',
      expect.any(String),
    );
  });

  it('throws lock-timeout error when lock is busy', async () => {
    redisService.setNxWithTtl.mockResolvedValue(false);

    await expect(
      service.withLock(
        'lock:test',
        async () => 'ok',
        { ttlMs: 5000, waitTimeoutMs: 1 },
      ),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      service.withLock(
        'lock:test',
        async () => 'ok',
        { ttlMs: 5000, waitTimeoutMs: 1 },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PROMOCODE_APPLY_LOCK_TIMEOUT',
      }),
    });
  });

  it('falls back without lock when redis is unavailable', async () => {
    redisService.setNxWithTtl.mockResolvedValue(null);

    const result = await service.withLock(
      'lock:test',
      async () => 'fallback-ok',
      { ttlMs: 5000, waitTimeoutMs: 100 },
    );

    expect(result).toBe('fallback-ok');
    expect(redisService.unlockIfOwner).not.toHaveBeenCalled();
  });

  it('handles concurrent lock attempts and times out second call', async () => {
    let lockOwnerToken: string | null = null;

    redisService.setNxWithTtl.mockImplementation(async (_key, token) => {
      if (lockOwnerToken) {
        return false;
      }

      lockOwnerToken = token;
      return true;
    });
    redisService.unlockIfOwner.mockImplementation(async (_key, token) => {
      if (lockOwnerToken === token) {
        lockOwnerToken = null;
        return true;
      }

      return false;
    });

    const firstCall = service.withLock(
      'lock:test',
      async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 40);
        });
        return 'first';
      },
      { ttlMs: 5000, waitTimeoutMs: 100 },
    );
    const secondCall = service.withLock(
      'lock:test',
      async () => 'second',
      { ttlMs: 5000, waitTimeoutMs: 15 },
    );

    const [firstResult, secondResult] = await Promise.allSettled([
      firstCall,
      secondCall,
    ]);

    expect(firstResult.status).toBe('fulfilled');
    expect(secondResult.status).toBe('rejected');
    if (secondResult.status === 'rejected') {
      const error = secondResult.reason as AppError;
      expect(error.getResponse()).toMatchObject({
        code: 'PROMOCODE_APPLY_LOCK_TIMEOUT',
      });
    }
  });
});
