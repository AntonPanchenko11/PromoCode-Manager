import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { SyncOutboxEventType, SyncOutboxStatus } from '../sync.types';

export type SyncOutboxEventDocument = HydratedDocument<SyncOutboxEvent>;

const OUTBOX_EVENT_TYPES: SyncOutboxEventType[] = [
  'users.upsert',
  'promocodes.upsert',
  'orders.upsert',
  'promo_usages.upsert',
];

const OUTBOX_STATUSES: SyncOutboxStatus[] = [
  'pending',
  'processing',
  'completed',
  'dead',
];

@Schema({
  timestamps: true,
  collection: 'sync_outbox_events',
})
export class SyncOutboxEvent {
  @Prop({ required: true, enum: OUTBOX_EVENT_TYPES })
  eventType!: SyncOutboxEventType;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  payload!: Record<string, unknown>;

  @Prop({ required: true, enum: OUTBOX_STATUSES, default: 'pending' })
  status!: SyncOutboxStatus;

  @Prop({ required: true, default: 0 })
  attempts!: number;

  @Prop({ required: true, default: () => new Date(), index: true })
  nextRetryAt!: Date;

  @Prop({ type: Date, required: false, default: null })
  processingStartedAt!: Date | null;

  @Prop({ type: Date, required: false, default: null })
  processedAt!: Date | null;

  @Prop({ type: String, required: false, default: null })
  lastError!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const SyncOutboxEventSchema = SchemaFactory.createForClass(SyncOutboxEvent);
SyncOutboxEventSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });
