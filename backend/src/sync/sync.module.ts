import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsCacheService } from './analytics-cache.service';
import { ClickhouseService } from './clickhouse.service';
import { MongoClickhouseSyncService } from './mongo-clickhouse-sync.service';
import { RedisLockService } from './redis-lock.service';
import { RedisService } from './redis.service';
import { SyncOutboxEvent, SyncOutboxEventSchema } from './schemas/sync-outbox-event.schema';
import { SyncOutboxService } from './sync-outbox.service';
import { SyncOutboxWorkerService } from './sync-outbox-worker.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SyncOutboxEvent.name,
        schema: SyncOutboxEventSchema,
      },
    ]),
  ],
  providers: [
    ClickhouseService,
    RedisService,
    RedisLockService,
    AnalyticsCacheService,
    MongoClickhouseSyncService,
    SyncOutboxService,
    SyncOutboxWorkerService,
  ],
  exports: [
    ClickhouseService,
    RedisService,
    RedisLockService,
    AnalyticsCacheService,
    MongoClickhouseSyncService,
    SyncOutboxService,
  ],
})
export class SyncModule {}
