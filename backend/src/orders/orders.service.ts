import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MongoServerError } from 'mongodb';
import { ClientSession, Model, Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { AuthUser } from '../common/types/auth-user.type';
import { PromocodeDocument } from '../promocodes/schemas/promocode.schema';
import { PromocodesService } from '../promocodes/promocodes.service';
import { AnalyticsCacheService } from '../sync/analytics-cache.service';
import { RedisLockService } from '../sync/redis-lock.service';
import { SyncOutboxService } from '../sync/sync-outbox.service';
import { UsersService } from '../users/users.service';
import { ApplyPromocodeDto } from './dto/apply-promocode.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
import { OrderResponseDto, PaginatedOrdersResponseDto } from './dto/order-response.dto';
import { Order, OrderDocument } from './schemas/order.schema';
import { PromoUsage, PromoUsageDocument } from './schemas/promo-usage.schema';

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;
type ApplyPromocodeResult = {
  order: OrderDocument;
  promoUsage: PromoUsageDocument;
};

type UserSyncMeta = {
  email: string;
  name: string;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(PromoUsage.name)
    private readonly promoUsageModel: Model<PromoUsageDocument>,
    private readonly usersService: UsersService,
    private readonly promocodesService: PromocodesService,
    private readonly redisLockService: RedisLockService,
    private readonly analyticsCacheService: AnalyticsCacheService,
    private readonly outboxService: SyncOutboxService,
  ) {}

  async create(authUser: AuthUser, dto: CreateOrderDto): Promise<OrderResponseDto> {
    this.ensureObjectId(authUser.userId);
    const user = await this.usersService.findByIdOrFail(authUser.userId);

    const amount = roundToTwoDecimals(dto.amount);
    const order = await this.orderModel.create({
      userId: new Types.ObjectId(authUser.userId),
      amount,
      promocodeId: null,
      promocodeCode: null,
      discountAmount: 0,
      finalAmount: amount,
    });

    await this.enqueueOrderOutboxEvent(order, {
      email: user.email,
      name: user.name,
    });
    await this.analyticsCacheService.invalidateAll();
    return this.toResponse(order);
  }

  async listMyOrders(
    authUser: AuthUser,
    query: ListMyOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    this.ensureObjectId(authUser.userId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const userId = new Types.ObjectId(authUser.userId);

    const [items, total] = await Promise.all([
      this.orderModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      this.orderModel.countDocuments({ userId }),
    ]);

    return {
      items: items.map((order) => this.toResponse(order)),
      page,
      pageSize,
      total,
    };
  }

  async applyPromocode(
    authUser: AuthUser,
    orderId: string,
    dto: ApplyPromocodeDto,
  ): Promise<OrderResponseDto> {
    const normalizedCode = dto.code.trim().toUpperCase();
    const lockKey = `lock:promocode:apply:${normalizedCode}`;

    return this.redisLockService.withLock(
      lockKey,
      async () => {
        const user = await this.usersService.findByIdOrFail(authUser.userId);
        const normalizedDto: ApplyPromocodeDto = {
          code: normalizedCode,
        };

        let result: ApplyPromocodeResult;
        try {
          result = await this.runApplyPromocodeTransaction(authUser, orderId, normalizedDto, {
            email: user.email,
            name: user.name,
          });
        } catch (error) {
          if (this.isTransactionNotSupported(error)) {
            result = await this.applyPromocodeAtomic(
              authUser,
              orderId,
              normalizedDto,
              {
                email: user.email,
                name: user.name,
              },
            );
          } else {
            throw error;
          }
        }

        await this.analyticsCacheService.invalidateAll();
        return this.toResponse(result.order);
      },
    );
  }

  private async runApplyPromocodeTransaction(
    authUser: AuthUser,
    orderId: string,
    dto: ApplyPromocodeDto,
    userSyncMeta: UserSyncMeta,
  ): Promise<ApplyPromocodeResult> {
    const session = await this.orderModel.db.startSession();
    let result: ApplyPromocodeResult | null = null;

    try {
      await session.withTransaction(async () => {
        result = await this.applyPromocodeAtomic(
          authUser,
          orderId,
          dto,
          userSyncMeta,
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    if (!result) {
      throw new AppError(HttpStatus.INTERNAL_SERVER_ERROR, 'ORDER_UPDATE_FAILED', 'Failed to apply promocode');
    }

    return result;
  }

  private async applyPromocodeAtomic(
    authUser: AuthUser,
    orderId: string,
    dto: ApplyPromocodeDto,
    userSyncMeta: UserSyncMeta,
    session?: ClientSession,
  ): Promise<ApplyPromocodeResult> {
    this.ensureObjectId(authUser.userId);
    this.ensureObjectId(orderId);

    const order = await this.orderModel.findById(
      orderId,
      undefined,
      session ? { session } : undefined,
    );
    if (!order) {
      throw new AppError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Order not found');
    }

    if (order.userId.toString() !== authUser.userId) {
      throw new AppError(HttpStatus.FORBIDDEN, 'ORDER_FORBIDDEN', 'Order does not belong to current user');
    }

    if (order.promocodeId || order.promocodeCode) {
      throw new AppError(HttpStatus.CONFLICT, 'ORDER_ALREADY_HAS_PROMOCODE', 'Order already has promocode');
    }

    const existingUsage = await this.promoUsageModel.findOne(
      { orderId: order._id },
      '_id',
      session ? { session } : undefined,
    );
    if (existingUsage) {
      throw new AppError(HttpStatus.CONFLICT, 'PROMOCODE_ALREADY_APPLIED', 'Promocode is already applied to this order');
    }

    const promocode = await this.promocodesService.findByCode(dto.code, session);
    if (!promocode) {
      throw new AppError(HttpStatus.NOT_FOUND, 'PROMOCODE_NOT_FOUND', 'Promocode not found');
    }

    this.assertPromocodeIsApplicable(promocode);

    const [totalUsageCount, userUsageCount] = await Promise.all([
      this.promoUsageModel.countDocuments(
        { promocodeId: promocode._id },
        session ? { session } : undefined,
      ),
      this.promoUsageModel.countDocuments({
        promocodeId: promocode._id,
        userId: order.userId,
      }, session ? { session } : undefined),
    ]);

    if (totalUsageCount >= promocode.usageLimitTotal) {
      throw new AppError(
        HttpStatus.CONFLICT,
        'PROMOCODE_TOTAL_LIMIT_EXCEEDED',
        'Promocode total usage limit exceeded',
      );
    }

    if (userUsageCount >= promocode.usageLimitPerUser) {
      throw new AppError(
        HttpStatus.CONFLICT,
        'PROMOCODE_USER_LIMIT_EXCEEDED',
        'Promocode user usage limit exceeded',
      );
    }

    const discountAmount = roundToTwoDecimals(order.amount * (promocode.discountPercent / 100));
    const finalAmount = roundToTwoDecimals(order.amount - discountAmount);

    const updatedOrder = await this.orderModel.findOneAndUpdate(
      {
        _id: order._id,
        userId: order.userId,
        promocodeId: null,
        promocodeCode: null,
      },
      {
        $set: {
          promocodeId: promocode._id,
          promocodeCode: promocode.code,
          discountAmount,
          finalAmount,
        },
      },
      { new: true, ...(session ? { session } : {}) },
    );

    if (!updatedOrder) {
      throw new AppError(
        HttpStatus.CONFLICT,
        'ORDER_ALREADY_HAS_PROMOCODE',
        'Order already has promocode',
      );
    }

    try {
      const createdUsages = await this.promoUsageModel.create(
        [{
          orderId: order._id,
          userId: order.userId,
          promocodeId: promocode._id,
          promocodeCode: promocode.code,
          orderAmount: order.amount,
          discountAmount,
          finalAmount,
          usedAt: new Date(),
        }],
        session ? { session } : undefined,
      );

      const createdUsage = createdUsages[0];
      if (!createdUsage) {
        throw new AppError(HttpStatus.INTERNAL_SERVER_ERROR, 'PROMO_USAGE_CREATE_FAILED', 'Failed to create promo usage');
      }

      await this.enqueueOrderAndUsageOutboxEvents(
        updatedOrder,
        createdUsage,
        userSyncMeta,
        session,
      );

      return {
        order: updatedOrder,
        promoUsage: createdUsage,
      };
    } catch (error) {
      if (
        error instanceof MongoServerError &&
        error.code === 11000
      ) {
        throw new AppError(
          HttpStatus.CONFLICT,
          'PROMOCODE_ALREADY_APPLIED',
          'Promocode is already applied to this order',
        );
      }

      throw error;
    }
  }

  toResponse(order: OrderDocument): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId.toString(),
      amount: order.amount,
      promocodeId: order.promocodeId ? order.promocodeId.toString() : null,
      promocodeCode: order.promocodeCode,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private ensureObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'INVALID_OBJECT_ID', 'Invalid object id');
    }
  }

  private assertPromocodeIsApplicable(promocode: PromocodeDocument): void {
    if (!promocode.isActive) {
      throw new AppError(HttpStatus.CONFLICT, 'PROMOCODE_INACTIVE', 'Promocode is inactive');
    }

    const now = new Date();

    if (promocode.dateFrom && now.getTime() < promocode.dateFrom.getTime()) {
      throw new AppError(HttpStatus.CONFLICT, 'PROMOCODE_NOT_STARTED', 'Promocode is not active yet');
    }

    if (promocode.dateTo && now.getTime() > promocode.dateTo.getTime()) {
      throw new AppError(HttpStatus.CONFLICT, 'PROMOCODE_EXPIRED', 'Promocode has expired');
    }
  }

  private isTransactionNotSupported(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return error.message.includes('Transaction numbers are only allowed on a replica set member or mongos');
  }

  private async enqueueOrderOutboxEvent(
    order: OrderDocument,
    userSyncMeta: UserSyncMeta,
    session?: ClientSession,
  ): Promise<void> {
    await this.outboxService.enqueue(
      'orders.upsert',
      {
        orderId: order.id,
        userId: order.userId.toString(),
        userEmail: userSyncMeta.email,
        userName: userSyncMeta.name,
        amount: order.amount,
        promocodeId: order.promocodeId ? order.promocodeId.toString() : null,
        promocodeCode: order.promocodeCode,
        discountAmount: order.discountAmount,
        finalAmount: order.finalAmount,
        createdAt: this.formatDateTime64(order.createdAt),
        updatedAt: this.formatDateTime64(order.updatedAt),
      },
      session,
    );
  }

  private async enqueueOrderAndUsageOutboxEvents(
    order: OrderDocument,
    promoUsage: PromoUsageDocument,
    userSyncMeta: UserSyncMeta,
    session?: ClientSession,
  ): Promise<void> {
    await this.outboxService.enqueueMany(
      [
        {
          eventType: 'orders.upsert',
          payload: {
            orderId: order.id,
            userId: order.userId.toString(),
            userEmail: userSyncMeta.email,
            userName: userSyncMeta.name,
            amount: order.amount,
            promocodeId: order.promocodeId ? order.promocodeId.toString() : null,
            promocodeCode: order.promocodeCode,
            discountAmount: order.discountAmount,
            finalAmount: order.finalAmount,
            createdAt: this.formatDateTime64(order.createdAt),
            updatedAt: this.formatDateTime64(order.updatedAt),
          },
        },
        {
          eventType: 'promo_usages.upsert',
          payload: {
            usageId: promoUsage.id,
            orderId: promoUsage.orderId.toString(),
            userId: promoUsage.userId.toString(),
            userEmail: userSyncMeta.email,
            userName: userSyncMeta.name,
            promocodeId: promoUsage.promocodeId.toString(),
            promocodeCode: promoUsage.promocodeCode,
            orderAmount: promoUsage.orderAmount,
            discountAmount: promoUsage.discountAmount,
            finalAmount: promoUsage.finalAmount,
            usedAt: this.formatDateTime64(promoUsage.usedAt),
            createdAt: this.formatDateTime64(promoUsage.createdAt),
          },
        },
      ],
      session,
    );
  }

  private formatDateTime64(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }
}
