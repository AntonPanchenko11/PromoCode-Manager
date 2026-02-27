import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { SyncOutboxEvent, SyncOutboxEventDocument } from './schemas/sync-outbox-event.schema';
import { SyncOutboxEventType, SyncOutboxPayloadByType } from './sync.types';

type OutboxEventInput<TType extends SyncOutboxEventType> = {
  eventType: TType;
  payload: SyncOutboxPayloadByType[TType];
};

@Injectable()
export class SyncOutboxService {
  constructor(
    @InjectModel(SyncOutboxEvent.name)
    private readonly outboxModel: Model<SyncOutboxEventDocument>,
  ) {}

  async enqueue<TType extends SyncOutboxEventType>(
    eventType: TType,
    payload: SyncOutboxPayloadByType[TType],
    session?: ClientSession,
  ): Promise<void> {
    await this.outboxModel.create(
      [
        {
          eventType,
          payload,
          status: 'pending',
          attempts: 0,
          nextRetryAt: new Date(),
        },
      ],
      session ? { session } : undefined,
    );
  }

  async enqueueMany(
    events: Array<OutboxEventInput<SyncOutboxEventType>>,
    session?: ClientSession,
  ): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const now = new Date();
    await this.outboxModel.insertMany(
      events.map((event) => ({
        eventType: event.eventType,
        payload: event.payload,
        status: 'pending',
        attempts: 0,
        nextRetryAt: now,
      })),
      session ? { session } : {},
    );
  }

  async reclaimStaleProcessing(processingTimeoutMs: number): Promise<number> {
    const staleBefore = new Date(Date.now() - processingTimeoutMs);
    const result = await this.outboxModel.updateMany(
      {
        status: 'processing',
        processingStartedAt: { $lte: staleBefore },
      },
      {
        $set: {
          status: 'pending',
          nextRetryAt: new Date(),
          processingStartedAt: null,
          lastError: 'stale_processing_reclaimed',
        },
      },
    );

    return result.modifiedCount;
  }

  async claimBatch(limit: number): Promise<SyncOutboxEventDocument[]> {
    const claimed: SyncOutboxEventDocument[] = [];
    const now = new Date();

    for (let i = 0; i < limit; i += 1) {
      const nextEvent = await this.outboxModel.findOneAndUpdate(
        {
          status: 'pending',
          nextRetryAt: { $lte: now },
        },
        {
          $set: {
            status: 'processing',
            processingStartedAt: new Date(),
          },
        },
        {
          sort: {
            nextRetryAt: 1,
            createdAt: 1,
          },
          new: true,
        },
      );

      if (!nextEvent) {
        break;
      }

      claimed.push(nextEvent);
    }

    return claimed;
  }

  async markCompleted(eventId: string): Promise<void> {
    await this.outboxModel.findByIdAndUpdate(eventId, {
      $set: {
        status: 'completed',
        processedAt: new Date(),
        processingStartedAt: null,
        lastError: null,
      },
      $inc: {
        attempts: 1,
      },
    });
  }

  async markFailed(
    event: SyncOutboxEventDocument,
    error: unknown,
    maxRetries: number,
    retryDelayMs: number,
  ): Promise<void> {
    const attempts = event.attempts + 1;
    const message = error instanceof Error ? error.message : String(error);

    if (attempts >= maxRetries) {
      await this.outboxModel.findByIdAndUpdate(event.id, {
        $set: {
          status: 'dead',
          processedAt: new Date(),
          processingStartedAt: null,
          lastError: message,
        },
        $inc: {
          attempts: 1,
        },
      });
      return;
    }

    await this.outboxModel.findByIdAndUpdate(event.id, {
      $set: {
        status: 'pending',
        nextRetryAt: new Date(Date.now() + retryDelayMs),
        processingStartedAt: null,
        lastError: message,
      },
      $inc: {
        attempts: 1,
      },
    });
  }
}
