import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AppError } from '../common/errors/app-error';
import { RedisService } from './redis.service';

type AcquireResult = 'acquired' | 'timeout' | 'unavailable';

type LockOptions = {
  ttlMs?: number;
  waitTimeoutMs?: number;
};

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);
  private readonly lockTtlMs: number;
  private readonly lockWaitTimeoutMs: number;
  private readonly retryDelayMs = 75;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.lockTtlMs = this.configService.get<number>('REDIS_LOCK_TTL_MS', 5000);
    this.lockWaitTimeoutMs = this.configService.get<number>('REDIS_LOCK_WAIT_TIMEOUT_MS', 2000);
  }

  async withLock<T>(
    lockKey: string,
    action: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T> {
    const token = randomUUID();
    const ttlMs = options?.ttlMs ?? this.lockTtlMs;
    const waitTimeoutMs = options?.waitTimeoutMs ?? this.lockWaitTimeoutMs;
    const acquireResult = await this.acquire(lockKey, token, ttlMs, waitTimeoutMs);

    if (acquireResult === 'timeout') {
      throw new AppError(
        HttpStatus.CONFLICT,
        'PROMOCODE_APPLY_LOCK_TIMEOUT',
        'Promocode apply operation is already in progress. Try again',
      );
    }

    if (acquireResult === 'unavailable') {
      this.logger.warn(`Redis unavailable, fallback without lock for key "${lockKey}"`);
      return action();
    }

    try {
      return await action();
    } finally {
      await this.redisService.unlockIfOwner(lockKey, token);
    }
  }

  private async acquire(
    lockKey: string,
    token: string,
    ttlMs: number,
    waitTimeoutMs: number,
  ): Promise<AcquireResult> {
    const deadline = Date.now() + waitTimeoutMs;

    while (Date.now() <= deadline) {
      const lockStatus = await this.redisService.setNxWithTtl(lockKey, token, ttlMs);

      if (lockStatus === true) {
        return 'acquired';
      }

      if (lockStatus === null) {
        return 'unavailable';
      }

      await this.sleep(this.retryDelayMs);
    }

    return 'timeout';
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
