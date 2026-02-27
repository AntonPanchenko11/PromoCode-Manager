import { Injectable } from '@nestjs/common';
import { ClickhouseService } from './clickhouse.service';
import {
  OrderUpsertPayload,
  PromoUsageUpsertPayload,
  PromocodeUpsertPayload,
  SyncOutboxEventType,
  SyncOutboxPayloadByType,
  UserUpsertPayload,
} from './sync.types';

@Injectable()
export class MongoClickhouseSyncService {
  constructor(private readonly clickhouseService: ClickhouseService) {}

  async dispatch(
    eventType: SyncOutboxEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    switch (eventType) {
      case 'users.upsert':
        await this.syncUserUpsert(payload as UserUpsertPayload);
        return;
      case 'promocodes.upsert':
        await this.syncPromocodeUpsert(payload as PromocodeUpsertPayload);
        return;
      case 'orders.upsert':
        await this.syncOrderUpsert(payload as OrderUpsertPayload);
        return;
      case 'promo_usages.upsert':
        await this.syncPromoUsageUpsert(payload as PromoUsageUpsertPayload);
        return;
      default: {
        const exhaustiveCheck: never = eventType;
        throw new Error(`Unsupported outbox event type: ${String(exhaustiveCheck)}`);
      }
    }
  }

  async syncUserUpsert(payload: SyncOutboxPayloadByType['users.upsert']): Promise<void> {
    await this.clickhouseService.insert('users', [
      {
        user_id: payload.userId,
        email: payload.email,
        name: payload.name,
        phone: payload.phone,
        is_active: payload.isActive ? 1 : 0,
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
        version: this.resolveVersion(payload.updatedAt),
      },
    ]);
  }

  async syncPromocodeUpsert(payload: SyncOutboxPayloadByType['promocodes.upsert']): Promise<void> {
    await this.clickhouseService.insert('promocodes', [
      {
        promocode_id: payload.promocodeId,
        code: payload.code,
        discount_percent: payload.discountPercent,
        usage_limit_total: payload.usageLimitTotal,
        usage_limit_per_user: payload.usageLimitPerUser,
        date_from: payload.dateFrom,
        date_to: payload.dateTo,
        is_active: payload.isActive ? 1 : 0,
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
        version: this.resolveVersion(payload.updatedAt),
      },
    ]);
  }

  async syncOrderUpsert(payload: SyncOutboxPayloadByType['orders.upsert']): Promise<void> {
    await this.clickhouseService.insert('orders', [
      {
        order_id: payload.orderId,
        user_id: payload.userId,
        user_email: payload.userEmail,
        user_name: payload.userName,
        amount: payload.amount,
        promocode_id: payload.promocodeId,
        promocode_code: payload.promocodeCode,
        discount_amount: payload.discountAmount,
        final_amount: payload.finalAmount,
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
        version: this.resolveVersion(payload.updatedAt),
      },
    ]);
  }

  async syncPromoUsageUpsert(payload: SyncOutboxPayloadByType['promo_usages.upsert']): Promise<void> {
    await this.clickhouseService.insert('promo_usages', [
      {
        usage_id: payload.usageId,
        order_id: payload.orderId,
        user_id: payload.userId,
        user_email: payload.userEmail,
        user_name: payload.userName,
        promocode_id: payload.promocodeId,
        promocode_code: payload.promocodeCode,
        order_amount: payload.orderAmount,
        discount_amount: payload.discountAmount,
        final_amount: payload.finalAmount,
        used_at: payload.usedAt,
        created_at: payload.createdAt,
        version: this.resolveVersion(payload.createdAt),
      },
    ]);
  }

  private resolveVersion(isoDate: string): number {
    const parsed = new Date(isoDate.replace(' ', 'T') + 'Z').getTime();
    return Number.isFinite(parsed) ? Math.max(parsed, Date.now()) : Date.now();
  }
}
