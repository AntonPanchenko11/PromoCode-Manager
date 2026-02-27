import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RedisService } from './redis.service';

const ANALYTICS_CACHE_VERSION_KEY = 'analytics:cache:version';

@Injectable()
export class AnalyticsCacheService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.ttlSeconds = this.configService.get<number>('ANALYTICS_CACHE_TTL_SECONDS', 60);
  }

  async get<T>(namespace: string, payload: string): Promise<T | null> {
    const key = await this.buildKey(namespace, payload);
    const raw = await this.redisService.get(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(namespace: string, payload: string, value: T): Promise<void> {
    const key = await this.buildKey(namespace, payload);
    await this.redisService.setWithTtlSeconds(
      key,
      JSON.stringify(value),
      this.ttlSeconds,
    );
  }

  async invalidateAll(): Promise<void> {
    await this.redisService.incr(ANALYTICS_CACHE_VERSION_KEY);
  }

  private async buildKey(namespace: string, payload: string): Promise<string> {
    const version = await this.getVersion();
    const hash = createHash('sha1').update(payload).digest('hex');
    return `analytics:cache:${namespace}:v${version}:${hash}`;
  }

  private async getVersion(): Promise<number> {
    const raw = await this.redisService.get(ANALYTICS_CACHE_VERSION_KEY);
    if (!raw) {
      return 1;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 1;
    }

    return Math.floor(parsed);
  }
}
