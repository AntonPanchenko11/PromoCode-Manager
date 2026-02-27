import { HttpStatus } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { AppError } from '../common/errors/app-error';
import { PromocodesService } from '../promocodes/promocodes.service';
import { AnalyticsCacheService } from '../sync/analytics-cache.service';
import { RedisLockService } from '../sync/redis-lock.service';
import { SyncOutboxService } from '../sync/sync-outbox.service';
import { UsersService } from '../users/users.service';
import { OrdersService } from './orders.service';
import { OrderDocument } from './schemas/order.schema';
import { PromoUsageDocument } from './schemas/promo-usage.schema';

type MockOrderModel = {
  create: jest.Mock;
  findById: jest.Mock;
  findOneAndUpdate: jest.Mock;
  db: {
    startSession: jest.Mock;
  };
};

type MockPromoUsageModel = {
  findOne: jest.Mock;
  countDocuments: jest.Mock;
  create: jest.Mock;
};

const baseOrder = {
  _id: new Types.ObjectId(),
  id: new Types.ObjectId().toString(),
  userId: new Types.ObjectId(),
  amount: 120.5,
  promocodeId: null,
  promocodeCode: null,
  discountAmount: 0,
  finalAmount: 120.5,
  createdAt: new Date('2026-02-26T00:00:00.000Z'),
  updatedAt: new Date('2026-02-26T00:00:00.000Z'),
};

const makeSession = () => ({
  withTransaction: jest.fn(async (handler: () => Promise<void>) => {
    await handler();
  }),
  endSession: jest.fn(async () => undefined),
});

describe('OrdersService', () => {
  let service: OrdersService;
  let orderModel: MockOrderModel;
  let promoUsageModel: MockPromoUsageModel;
  let usersService: jest.Mocked<UsersService>;
  let promocodesService: jest.Mocked<PromocodesService>;
  let lockService: jest.Mocked<RedisLockService>;
  let analyticsCacheService: jest.Mocked<AnalyticsCacheService>;
  let outboxService: jest.Mocked<SyncOutboxService>;

  beforeEach(() => {
    orderModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      db: {
        startSession: jest.fn(),
      },
    };

    promoUsageModel = {
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
    };

    usersService = {
      findByIdOrFail: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    promocodesService = {
      findByCode: jest.fn(),
    } as unknown as jest.Mocked<PromocodesService>;

    lockService = {
      withLock: jest.fn(async (_key: string, action: () => Promise<unknown>) => action()),
    } as unknown as jest.Mocked<RedisLockService>;

    analyticsCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      invalidateAll: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsCacheService>;

    outboxService = {
      enqueue: jest.fn(),
      enqueueMany: jest.fn(),
      reclaimStaleProcessing: jest.fn(),
      claimBatch: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    } as unknown as jest.Mocked<SyncOutboxService>;

    service = new OrdersService(
      orderModel as unknown as Model<OrderDocument>,
      promoUsageModel as unknown as Model<PromoUsageDocument>,
      usersService,
      promocodesService,
      lockService,
      analyticsCacheService,
      outboxService,
    );
  });

  it('creates order for current user', async () => {
    const userId = new Types.ObjectId().toString();
    usersService.findByIdOrFail.mockResolvedValue({
      email: 'user@example.com',
      name: 'Anton',
    } as never);
    orderModel.create.mockResolvedValue({
      ...baseOrder,
      id: 'order-1',
      userId: new Types.ObjectId(userId),
    });

    const result = await service.create(
      { userId, email: 'user@example.com' },
      { amount: 120.5 },
    );

    expect(result.finalAmount).toBe(120.5);
    expect(orderModel.create).toHaveBeenCalled();
    expect(outboxService.enqueue).toHaveBeenCalled();
    expect(analyticsCacheService.invalidateAll).toHaveBeenCalled();
  });

  it('applies promocode in happy path', async () => {
    const session = makeSession();
    const userId = baseOrder.userId.toString();
    const promoId = new Types.ObjectId();

    orderModel.db.startSession.mockResolvedValue(session);
    usersService.findByIdOrFail.mockResolvedValue({
      email: 'user@example.com',
      name: 'Anton',
    } as never);
    orderModel.findById.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
    });
    promoUsageModel.findOne.mockResolvedValue(null);
    promocodesService.findByCode.mockResolvedValue({
      _id: promoId,
      code: 'SUMMER2026',
      discountPercent: 10,
      usageLimitTotal: 100,
      usageLimitPerUser: 2,
      isActive: true,
      dateFrom: null,
      dateTo: null,
    } as never);
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    orderModel.findOneAndUpdate.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
      promocodeId: promoId,
      promocodeCode: 'SUMMER2026',
      discountAmount: 12.05,
      finalAmount: 108.45,
    });
    promoUsageModel.create.mockResolvedValue([{
      id: new Types.ObjectId().toString(),
      orderId: baseOrder._id,
      userId: new Types.ObjectId(userId),
      promocodeId: promoId,
      promocodeCode: 'SUMMER2026',
      orderAmount: 120.5,
      discountAmount: 12.05,
      finalAmount: 108.45,
      usedAt: new Date('2026-02-26T00:00:01.000Z'),
      createdAt: new Date('2026-02-26T00:00:01.000Z'),
    }]);

    const result = await service.applyPromocode(
      { userId, email: 'user@example.com' },
      baseOrder._id.toString(),
      { code: 'SUMMER2026' },
    );

    expect(result.promocodeCode).toBe('SUMMER2026');
    expect(result.discountAmount).toBe(12.05);
    expect(lockService.withLock).toHaveBeenCalled();
    expect(session.withTransaction).toHaveBeenCalled();
    expect(promoUsageModel.create).toHaveBeenCalled();
    expect(outboxService.enqueueMany).toHaveBeenCalled();
    expect(analyticsCacheService.invalidateAll).toHaveBeenCalled();
  });

  it('returns lock-timeout error when distributed lock was not acquired', async () => {
    const userId = baseOrder.userId.toString();
    lockService.withLock.mockRejectedValue(
      new AppError(
        HttpStatus.CONFLICT,
        'PROMOCODE_APPLY_LOCK_TIMEOUT',
        'Promocode apply operation is already in progress. Try again',
      ),
    );

    await expect(
      service.applyPromocode(
        { userId, email: 'user@example.com' },
        baseOrder._id.toString(),
        { code: 'SUMMER2026' },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PROMOCODE_APPLY_LOCK_TIMEOUT',
      }),
    });
  });

  it('handles parallel apply attempts: first succeeds, second times out on lock', async () => {
    const session = makeSession();
    const userId = baseOrder.userId.toString();
    const promoId = new Types.ObjectId();
    let isLocked = false;

    lockService.withLock.mockImplementation(async (_key, action) => {
      if (isLocked) {
        throw new AppError(
          HttpStatus.CONFLICT,
          'PROMOCODE_APPLY_LOCK_TIMEOUT',
          'Promocode apply operation is already in progress. Try again',
        );
      }

      isLocked = true;
      try {
        return await action();
      } finally {
        isLocked = false;
      }
    });

    orderModel.db.startSession.mockResolvedValue(session);
    usersService.findByIdOrFail.mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 30);
      });
      return {
        email: 'user@example.com',
        name: 'Anton',
      } as never;
    });
    orderModel.findById.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
    });
    promoUsageModel.findOne.mockResolvedValue(null);
    promocodesService.findByCode.mockResolvedValue({
      _id: promoId,
      code: 'SUMMER2026',
      discountPercent: 10,
      usageLimitTotal: 100,
      usageLimitPerUser: 2,
      isActive: true,
      dateFrom: null,
      dateTo: null,
    } as never);
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    orderModel.findOneAndUpdate.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
      promocodeId: promoId,
      promocodeCode: 'SUMMER2026',
      discountAmount: 12.05,
      finalAmount: 108.45,
    });
    promoUsageModel.create.mockResolvedValue([{
      id: new Types.ObjectId().toString(),
      orderId: baseOrder._id,
      userId: new Types.ObjectId(userId),
      promocodeId: promoId,
      promocodeCode: 'SUMMER2026',
      orderAmount: 120.5,
      discountAmount: 12.05,
      finalAmount: 108.45,
      usedAt: new Date('2026-02-26T00:00:01.000Z'),
      createdAt: new Date('2026-02-26T00:00:01.000Z'),
    }]);

    const firstCall = service.applyPromocode(
      { userId, email: 'user@example.com' },
      baseOrder._id.toString(),
      { code: 'SUMMER2026' },
    );
    const secondCall = service.applyPromocode(
      { userId, email: 'user@example.com' },
      baseOrder._id.toString(),
      { code: 'SUMMER2026' },
    );

    const [firstResult, secondResult] = await Promise.allSettled([
      firstCall,
      secondCall,
    ]);

    expect(firstResult.status).toBe('fulfilled');
    expect(secondResult.status).toBe('rejected');
    if (secondResult.status === 'rejected') {
      const error = secondResult.reason as AppError;
      expect(error.getResponse()).toMatchObject({
        code: 'PROMOCODE_APPLY_LOCK_TIMEOUT',
      });
    }
    expect(lockService.withLock).toHaveBeenCalledTimes(2);
  });

  it('rejects repeated apply when order already has promocode', async () => {
    const session = makeSession();
    const userId = baseOrder.userId.toString();

    orderModel.db.startSession.mockResolvedValue(session);
    usersService.findByIdOrFail.mockResolvedValue({
      email: 'user@example.com',
      name: 'Anton',
    } as never);
    orderModel.findById.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
      promocodeCode: 'EXISTING',
    });

    let error: AppError | null = null;
    try {
      await service.applyPromocode(
        { userId, email: 'user@example.com' },
        baseOrder._id.toString(),
        { code: 'SUMMER2026' },
      );
    } catch (caught) {
      error = caught as AppError;
    }

    expect(error).toBeInstanceOf(AppError);
    expect(error?.getResponse()).toMatchObject({
      code: 'ORDER_ALREADY_HAS_PROMOCODE',
    });
  });

  it('rejects expired promocode', async () => {
    const session = makeSession();
    const userId = baseOrder.userId.toString();

    orderModel.db.startSession.mockResolvedValue(session);
    usersService.findByIdOrFail.mockResolvedValue({
      email: 'user@example.com',
      name: 'Anton',
    } as never);
    orderModel.findById.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
    });
    promoUsageModel.findOne.mockResolvedValue(null);
    promocodesService.findByCode.mockResolvedValue({
      _id: new Types.ObjectId(),
      code: 'OLDCODE',
      discountPercent: 10,
      usageLimitTotal: 10,
      usageLimitPerUser: 1,
      isActive: true,
      dateFrom: null,
      dateTo: new Date('2020-01-01T00:00:00.000Z'),
    } as never);

    let error: AppError | null = null;
    try {
      await service.applyPromocode(
        { userId, email: 'user@example.com' },
        baseOrder._id.toString(),
        { code: 'OLDCODE' },
      );
    } catch (caught) {
      error = caught as AppError;
    }

    expect(error).toBeInstanceOf(AppError);
    expect(error?.getResponse()).toMatchObject({
      code: 'PROMOCODE_EXPIRED',
    });
  });

  it('rejects total limit exceeded', async () => {
    const session = makeSession();
    const userId = baseOrder.userId.toString();

    orderModel.db.startSession.mockResolvedValue(session);
    usersService.findByIdOrFail.mockResolvedValue({
      email: 'user@example.com',
      name: 'Anton',
    } as never);
    orderModel.findById.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
    });
    promoUsageModel.findOne.mockResolvedValue(null);
    promocodesService.findByCode.mockResolvedValue({
      _id: new Types.ObjectId(),
      code: 'LIMITED',
      discountPercent: 10,
      usageLimitTotal: 1,
      usageLimitPerUser: 1,
      isActive: true,
      dateFrom: null,
      dateTo: null,
    } as never);
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    let error: AppError | null = null;
    try {
      await service.applyPromocode(
        { userId, email: 'user@example.com' },
        baseOrder._id.toString(),
        { code: 'LIMITED' },
      );
    } catch (caught) {
      error = caught as AppError;
    }

    expect(error).toBeInstanceOf(AppError);
    expect(error?.getResponse()).toMatchObject({
      code: 'PROMOCODE_TOTAL_LIMIT_EXCEEDED',
    });
  });

  it('rejects apply when order belongs to another user', async () => {
    const session = makeSession();
    const authUserId = new Types.ObjectId().toString();

    orderModel.db.startSession.mockResolvedValue(session);
    usersService.findByIdOrFail.mockResolvedValue({
      email: 'owner@example.com',
      name: 'Owner',
    } as never);
    orderModel.findById.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(),
    });

    await expect(
      service.applyPromocode(
        { userId: authUserId, email: 'user@example.com' },
        baseOrder._id.toString(),
        { code: 'SUMMER2026' },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'ORDER_FORBIDDEN',
      }),
    });
  });

  it('rejects user usage limit exceeded', async () => {
    const session = makeSession();
    const userId = baseOrder.userId.toString();

    orderModel.db.startSession.mockResolvedValue(session);
    usersService.findByIdOrFail.mockResolvedValue({
      email: 'user@example.com',
      name: 'Anton',
    } as never);
    orderModel.findById.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
    });
    promoUsageModel.findOne.mockResolvedValue(null);
    promocodesService.findByCode.mockResolvedValue({
      _id: new Types.ObjectId(),
      code: 'LIMIT_PER_USER',
      discountPercent: 10,
      usageLimitTotal: 100,
      usageLimitPerUser: 1,
      isActive: true,
      dateFrom: null,
      dateTo: null,
    } as never);
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await expect(
      service.applyPromocode(
        { userId, email: 'user@example.com' },
        baseOrder._id.toString(),
        { code: 'LIMIT_PER_USER' },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PROMOCODE_USER_LIMIT_EXCEEDED',
      }),
    });
  });

  it('maps duplicate promo usage insert to PROMOCODE_ALREADY_APPLIED', async () => {
    const session = makeSession();
    const userId = baseOrder.userId.toString();
    const promoId = new Types.ObjectId();
    const duplicateError = new MongoServerError({ message: 'E11000 duplicate key error' });
    duplicateError.code = 11000;

    orderModel.db.startSession.mockResolvedValue(session);
    usersService.findByIdOrFail.mockResolvedValue({
      email: 'user@example.com',
      name: 'Anton',
    } as never);
    orderModel.findById.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
    });
    promoUsageModel.findOne.mockResolvedValue(null);
    promocodesService.findByCode.mockResolvedValue({
      _id: promoId,
      code: 'SUMMER2026',
      discountPercent: 10,
      usageLimitTotal: 100,
      usageLimitPerUser: 2,
      isActive: true,
      dateFrom: null,
      dateTo: null,
    } as never);
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    orderModel.findOneAndUpdate.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
      promocodeId: promoId,
      promocodeCode: 'SUMMER2026',
      discountAmount: 12.05,
      finalAmount: 108.45,
    });
    promoUsageModel.create.mockRejectedValue(duplicateError);

    await expect(
      service.applyPromocode(
        { userId, email: 'user@example.com' },
        baseOrder._id.toString(),
        { code: 'SUMMER2026' },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PROMOCODE_ALREADY_APPLIED',
      }),
    });
  });

  it('falls back to atomic mode when transactions are not supported', async () => {
    const session = makeSession();
    const userId = baseOrder.userId.toString();
    const promoId = new Types.ObjectId();

    session.withTransaction.mockRejectedValue(
      new Error('Transaction numbers are only allowed on a replica set member or mongos'),
    );

    orderModel.db.startSession.mockResolvedValue(session);
    usersService.findByIdOrFail.mockResolvedValue({
      email: 'user@example.com',
      name: 'Anton',
    } as never);
    orderModel.findById.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
    });
    promoUsageModel.findOne.mockResolvedValue(null);
    promocodesService.findByCode.mockResolvedValue({
      _id: promoId,
      code: 'SUMMER2026',
      discountPercent: 10,
      usageLimitTotal: 100,
      usageLimitPerUser: 2,
      isActive: true,
      dateFrom: null,
      dateTo: null,
    } as never);
    promoUsageModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    orderModel.findOneAndUpdate.mockResolvedValue({
      ...baseOrder,
      userId: new Types.ObjectId(userId),
      promocodeId: promoId,
      promocodeCode: 'SUMMER2026',
      discountAmount: 12.05,
      finalAmount: 108.45,
    });
    promoUsageModel.create.mockResolvedValue([{
      id: new Types.ObjectId().toString(),
      orderId: baseOrder._id,
      userId: new Types.ObjectId(userId),
      promocodeId: promoId,
      promocodeCode: 'SUMMER2026',
      orderAmount: 120.5,
      discountAmount: 12.05,
      finalAmount: 108.45,
      usedAt: new Date('2026-02-26T00:00:01.000Z'),
      createdAt: new Date('2026-02-26T00:00:01.000Z'),
    }]);

    const result = await service.applyPromocode(
      { userId, email: 'user@example.com' },
      baseOrder._id.toString(),
      { code: 'SUMMER2026' },
    );

    expect(result.promocodeCode).toBe('SUMMER2026');
    expect(session.endSession).toHaveBeenCalled();
    expect(outboxService.enqueueMany).toHaveBeenCalled();
  });
});
