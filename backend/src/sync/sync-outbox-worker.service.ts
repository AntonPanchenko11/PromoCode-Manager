import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClickhouseSyncService } from './mongo-clickhouse-sync.service';
import { SyncOutboxService } from './sync-outbox.service';

@Injectable()
export class SyncOutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncOutboxWorkerService.name);
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;
  private readonly processingTimeoutMs: number;

  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isShuttingDown = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly outboxService: SyncOutboxService,
    private readonly syncService: MongoClickhouseSyncService,
  ) {
    this.pollIntervalMs = this.configService.get<number>('OUTBOX_POLL_INTERVAL_MS', 1000);
    this.batchSize = this.configService.get<number>('OUTBOX_BATCH_SIZE', 50);
    this.maxRetries = this.configService.get<number>('CH_SYNC_MAX_RETRIES', 4);
    this.baseRetryDelayMs = this.configService.get<number>('CH_SYNC_RETRY_BASE_MS', 500);
    this.processingTimeoutMs = this.configService.get<number>('OUTBOX_PROCESSING_TIMEOUT_MS', 30_000);
  }

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);

    void this.tick();
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.isRunning || this.isShuttingDown) {
      return;
    }

    this.isRunning = true;

    try {
      const reclaimed = await this.outboxService.reclaimStaleProcessing(this.processingTimeoutMs);
      if (reclaimed > 0) {
        this.logger.warn(`Reclaimed ${reclaimed} stale outbox events`);
      }

      const events = await this.outboxService.claimBatch(this.batchSize);
      if (events.length === 0) {
        return;
      }

      for (const event of events) {
        try {
          await this.syncService.dispatch(event.eventType, event.payload);
          await this.outboxService.markCompleted(event.id);
        } catch (error) {
          const nextDelay = this.getBackoffDelay(event.attempts);
          await this.outboxService.markFailed(event, error, this.maxRetries, nextDelay);
          this.logger.warn(
            `Outbox event failed: ${event.id} (${event.eventType}), attempt=${event.attempts + 1}`,
          );
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  private getBackoffDelay(attempt: number): number {
    const exponent = Math.max(0, attempt);
    const delay = this.baseRetryDelayMs * Math.pow(2, exponent);
    return Math.min(delay, 10_000);
  }
}
