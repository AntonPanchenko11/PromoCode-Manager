import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { AnalyticsCacheService } from '../sync/analytics-cache.service';
import { SyncOutboxService } from '../sync/sync-outbox.service';
import { CreatePromocodeDto } from './dto/create-promocode.dto';
import { PromocodeResponseDto } from './dto/promocode-response.dto';
import { UpdatePromocodeDto } from './dto/update-promocode.dto';
import { Promocode, PromocodeDocument } from './schemas/promocode.schema';

@Injectable()
export class PromocodesService {
  constructor(
    @InjectModel(Promocode.name)
    private readonly promocodeModel: Model<PromocodeDocument>,
    private readonly analyticsCacheService: AnalyticsCacheService,
    private readonly outboxService: SyncOutboxService,
  ) {}

  async create(dto: CreatePromocodeDto): Promise<PromocodeResponseDto> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.promocodeModel.findOne({ code }).select('_id').lean();
    if (existing) {
      throw new AppError(HttpStatus.CONFLICT, 'PROMOCODE_CODE_EXISTS', 'Promocode with this code already exists');
    }

    const dateFrom = dto.dateFrom ? new Date(dto.dateFrom) : null;
    const dateTo = dto.dateTo ? new Date(dto.dateTo) : null;
    this.assertDateRange(dateFrom, dateTo);

    const promocode = await this.promocodeModel.create({
      code,
      discountPercent: dto.discountPercent,
      usageLimitTotal: dto.usageLimitTotal,
      usageLimitPerUser: dto.usageLimitPerUser,
      dateFrom,
      dateTo,
      isActive: dto.isActive ?? true,
    });

    await this.enqueuePromocodeOutbox(promocode);
    await this.analyticsCacheService.invalidateAll();
    return this.toResponse(promocode);
  }

  async findByIdOrFail(id: string): Promise<PromocodeDocument> {
    this.ensureObjectId(id);

    const promocode = await this.promocodeModel.findById(id);
    if (!promocode) {
      throw new AppError(HttpStatus.NOT_FOUND, 'PROMOCODE_NOT_FOUND', 'Promocode not found');
    }

    return promocode;
  }

  async findResponseById(id: string): Promise<PromocodeResponseDto> {
    const promocode = await this.findByIdOrFail(id);
    return this.toResponse(promocode);
  }

  async findByCode(code: string, session?: ClientSession): Promise<PromocodeDocument | null> {
    return this.promocodeModel.findOne(
      { code: code.trim().toUpperCase() },
      undefined,
      session ? { session } : undefined,
    );
  }

  async update(id: string, dto: UpdatePromocodeDto): Promise<PromocodeResponseDto> {
    const promocode = await this.findByIdOrFail(id);

    if (dto.code) {
      const normalizedCode = dto.code.trim().toUpperCase();
      const existing = await this.promocodeModel
        .findOne({ code: normalizedCode, _id: { $ne: promocode.id } })
        .select('_id')
        .lean();

      if (existing) {
        throw new AppError(HttpStatus.CONFLICT, 'PROMOCODE_CODE_EXISTS', 'Promocode with this code already exists');
      }

      promocode.code = normalizedCode;
    }

    if (dto.discountPercent !== undefined) {
      promocode.discountPercent = dto.discountPercent;
    }

    if (dto.usageLimitTotal !== undefined) {
      promocode.usageLimitTotal = dto.usageLimitTotal;
    }

    if (dto.usageLimitPerUser !== undefined) {
      promocode.usageLimitPerUser = dto.usageLimitPerUser;
    }

    const nextDateFrom =
      dto.dateFrom !== undefined
        ? dto.dateFrom
          ? new Date(dto.dateFrom)
          : null
        : promocode.dateFrom;

    const nextDateTo =
      dto.dateTo !== undefined
        ? dto.dateTo
          ? new Date(dto.dateTo)
          : null
        : promocode.dateTo;

    this.assertDateRange(nextDateFrom, nextDateTo);
    promocode.dateFrom = nextDateFrom;
    promocode.dateTo = nextDateTo;

    if (dto.isActive !== undefined) {
      promocode.isActive = dto.isActive;
    }

    await promocode.save();
    await this.enqueuePromocodeOutbox(promocode);
    await this.analyticsCacheService.invalidateAll();
    return this.toResponse(promocode);
  }

  async deactivate(id: string): Promise<PromocodeResponseDto> {
    const promocode = await this.findByIdOrFail(id);
    promocode.isActive = false;
    await promocode.save();
    await this.enqueuePromocodeOutbox(promocode);
    await this.analyticsCacheService.invalidateAll();
    return this.toResponse(promocode);
  }

  toResponse(promocode: PromocodeDocument): PromocodeResponseDto {
    return {
      id: promocode.id,
      code: promocode.code,
      discountPercent: promocode.discountPercent,
      usageLimitTotal: promocode.usageLimitTotal,
      usageLimitPerUser: promocode.usageLimitPerUser,
      dateFrom: promocode.dateFrom ? promocode.dateFrom.toISOString() : null,
      dateTo: promocode.dateTo ? promocode.dateTo.toISOString() : null,
      isActive: promocode.isActive,
      createdAt: promocode.createdAt.toISOString(),
      updatedAt: promocode.updatedAt.toISOString(),
    };
  }

  private ensureObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'INVALID_OBJECT_ID', 'Invalid object id');
    }
  }

  private assertDateRange(dateFrom: Date | null, dateTo: Date | null): void {
    if (!dateFrom || !dateTo) {
      return;
    }

    if (dateFrom.getTime() > dateTo.getTime()) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', 'dateFrom must be less than or equal to dateTo');
    }
  }

  private async enqueuePromocodeOutbox(promocode: PromocodeDocument): Promise<void> {
    await this.outboxService.enqueue('promocodes.upsert', {
      promocodeId: promocode.id,
      code: promocode.code,
      discountPercent: promocode.discountPercent,
      usageLimitTotal: promocode.usageLimitTotal,
      usageLimitPerUser: promocode.usageLimitPerUser,
      dateFrom: promocode.dateFrom ? this.formatDateTime64(promocode.dateFrom) : null,
      dateTo: promocode.dateTo ? this.formatDateTime64(promocode.dateTo) : null,
      isActive: promocode.isActive,
      createdAt: this.formatDateTime64(promocode.createdAt),
      updatedAt: this.formatDateTime64(promocode.updatedAt),
    });
  }

  private formatDateTime64(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }
}
