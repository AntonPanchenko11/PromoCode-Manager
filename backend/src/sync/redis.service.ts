import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType, createClient } from 'redis';

type RedisSetResult = boolean | null;
type RedisUnlockResult = boolean | null;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;
  private connectPromise: Promise<RedisClientType> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
    });

    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis client error: ${error.message}`);
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      const client = await this.ensureConnected();
      return client.get(key);
    } catch (error) {
      this.logger.warn(`Redis GET failed for key "${key}": ${this.toErrorMessage(error)}`);
      return null;
    }
  }

  async setNxWithTtl(key: string, value: string, ttlMs: number): Promise<RedisSetResult> {
    try {
      const client = await this.ensureConnected();
      const result = await client.set(key, value, {
        NX: true,
        PX: ttlMs,
      });
      return result === 'OK';
    } catch (error) {
      this.logger.warn(`Redis SET NX failed for key "${key}": ${this.toErrorMessage(error)}`);
      return null;
    }
  }

  async setWithTtlSeconds(key: string, value: string, ttlSeconds: number): Promise<RedisSetResult> {
    try {
      const client = await this.ensureConnected();
      const result = await client.set(key, value, {
        EX: ttlSeconds,
      });
      return result === 'OK';
    } catch (error) {
      this.logger.warn(`Redis SET EX failed for key "${key}": ${this.toErrorMessage(error)}`);
      return null;
    }
  }

  async incr(key: string): Promise<number | null> {
    try {
      const client = await this.ensureConnected();
      return client.incr(key);
    } catch (error) {
      this.logger.warn(`Redis INCR failed for key "${key}": ${this.toErrorMessage(error)}`);
      return null;
    }
  }

  async unlockIfOwner(key: string, token: string): Promise<RedisUnlockResult> {
    const script = [
      'if redis.call("GET", KEYS[1]) == ARGV[1] then',
      '  return redis.call("DEL", KEYS[1])',
      'end',
      'return 0',
    ].join('\n');

    try {
      const client = await this.ensureConnected();
      const raw = await client.sendCommand(['EVAL', script, '1', key, token]);
      const numeric = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(numeric) ? numeric > 0 : false;
    } catch (error) {
      this.logger.warn(`Redis unlock failed for key "${key}": ${this.toErrorMessage(error)}`);
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  private async ensureConnected(): Promise<RedisClientType> {
    if (this.client.isOpen) {
      return this.client;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.client.connect()
        .catch((error: unknown) => {
          this.logger.warn(`Redis connect failed: ${this.toErrorMessage(error)}`);
          throw error;
        })
        .finally(() => {
          this.connectPromise = null;
        });
    }

    await this.connectPromise;
    return this.client;
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
