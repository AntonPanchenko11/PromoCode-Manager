import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickHouseClient, createClient } from '@clickhouse/client';

type ClickhouseRow = Record<string, unknown>;
type ClickhouseQueryParams = Record<string, unknown>;

@Injectable()
export class ClickhouseService implements OnModuleDestroy {
  private readonly logger = new Logger(ClickhouseService.name);
  private readonly database: string;
  private readonly client: ClickHouseClient;

  constructor(private readonly configService: ConfigService) {
    this.database = this.configService.get<string>('CLICKHOUSE_DB', 'promo_code_manager');
    this.client = createClient({
      url: this.configService.get<string>('CLICKHOUSE_URL', 'http://localhost:8123'),
      username: this.configService.get<string>('CLICKHOUSE_USER', 'pcm_user'),
      password: this.configService.get<string>('CLICKHOUSE_PASSWORD', 'pcm_password'),
      database: this.database,
    });
  }

  async insert(table: string, rows: ClickhouseRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    await this.client.insert({
      table,
      values: rows,
      format: 'JSONEachRow',
    });
  }

  async query<T>(
    query: string,
    queryParams: ClickhouseQueryParams = {},
  ): Promise<T[]> {
    const result = await this.client.query({
      query,
      format: 'JSONEachRow',
      query_params: queryParams,
    });

    const rows = await result.json<T>();
    return Array.isArray(rows) ? rows : [];
  }

  async ping(): Promise<void> {
    try {
      await this.client.ping();
    } catch (error) {
      this.logger.error(`ClickHouse ping failed for database ${this.database}`, error as Error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
