import { ConfigService } from '@nestjs/config';
import { createClient } from '@clickhouse/client';
import { ClickhouseService } from './clickhouse.service';

jest.mock('@clickhouse/client', () => ({
  createClient: jest.fn(),
}));

type MockClickhouseClient = {
  insert: jest.Mock;
  query: jest.Mock;
  ping: jest.Mock;
  close: jest.Mock;
};

const makeConfigServiceMock = (): ConfigService => {
  return {
    get: jest.fn((key: string, fallback: string) => {
      const values: Record<string, string> = {
        CLICKHOUSE_DB: 'promo_code_manager',
        CLICKHOUSE_URL: 'http://localhost:8123',
        CLICKHOUSE_USER: 'pcm_user',
        CLICKHOUSE_PASSWORD: 'pcm_password',
      };

      return values[key] ?? fallback;
    }),
  } as unknown as ConfigService;
};

describe('ClickhouseService', () => {
  let mockClient: MockClickhouseClient;
  let service: ClickhouseService;

  beforeEach(() => {
    mockClient = {
      insert: jest.fn(),
      query: jest.fn(),
      ping: jest.fn(),
      close: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockClient);
    service = new ClickhouseService(makeConfigServiceMock());
  });

  it('runs parameterized JSONEachRow select query', async () => {
    const json = jest.fn().mockResolvedValue([{ id: 'u-1', total: 12 }]);
    mockClient.query.mockResolvedValue({ json });

    const rows = await service.query<{ id: string; total: number }>(
      'SELECT * FROM users WHERE user_id = {userId:String}',
      { userId: 'u-1' },
    );

    expect(mockClient.query).toHaveBeenCalledWith({
      query: 'SELECT * FROM users WHERE user_id = {userId:String}',
      format: 'JSONEachRow',
      query_params: { userId: 'u-1' },
    });
    expect(rows).toEqual([{ id: 'u-1', total: 12 }]);
  });
});
