import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { AnalyticsCacheService } from '../sync/analytics-cache.service';
import { SyncOutboxService } from '../sync/sync-outbox.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User, UserDocument } from './schemas/user.schema';

type CreateUserInput = {
  email: string;
  name: string;
  phone: string;
  password: string;
  isActive?: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly analyticsCacheService: AnalyticsCacheService,
    private readonly outboxService: SyncOutboxService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.createWithPassword(dto);
    return this.toResponse(user);
  }

  async createWithPassword(input: CreateUserInput): Promise<UserDocument> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userModel.findOne({ email }).select('_id').lean();
    if (existing) {
      throw new AppError(HttpStatus.CONFLICT, 'USER_EMAIL_EXISTS', 'User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.userModel.create({
      email,
      name: input.name,
      phone: input.phone,
      passwordHash,
      refreshTokenHash: null,
      isActive: input.isActive ?? true,
    });

    await this.enqueueUserOutbox(user);
    await this.analyticsCacheService.invalidateAll();
    return user;
  }

  async findPublicById(id: string): Promise<UserResponseDto> {
    const user = await this.findByIdOrFail(id);
    return this.toResponse(user);
  }

  async findByIdOrFail(id: string): Promise<UserDocument> {
    this.ensureObjectId(id);

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new AppError(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');
    }

    return user;
  }

  async findByIdWithSecrets(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return this.userModel
      .findById(id)
      .select('+passwordHash +refreshTokenHash');
  }

  async findByEmailWithSecrets(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.trim().toLowerCase() })
      .select('+passwordHash +refreshTokenHash');
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    this.ensureObjectId(id);

    const patch: UpdateUserDto = { ...dto };
    if (patch.email) {
      patch.email = patch.email.trim().toLowerCase();
      const existing = await this.userModel
        .findOne({
          email: patch.email,
          _id: { $ne: id },
        })
        .select('_id')
        .lean();

      if (existing) {
        throw new AppError(HttpStatus.CONFLICT, 'USER_EMAIL_EXISTS', 'User with this email already exists');
      }
    }

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new AppError(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');
    }

    await this.enqueueUserOutbox(user);
    await this.analyticsCacheService.invalidateAll();
    return this.toResponse(user);
  }

  async deactivate(id: string): Promise<UserResponseDto> {
    this.ensureObjectId(id);

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    );

    if (!user) {
      throw new AppError(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');
    }

    await this.enqueueUserOutbox(user);
    await this.analyticsCacheService.invalidateAll();
    return this.toResponse(user);
  }

  async setRefreshTokenHash(userId: string, refreshToken: string | null): Promise<void> {
    this.ensureObjectId(userId);

    const refreshTokenHash = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userModel.findByIdAndUpdate(userId, { $set: { refreshTokenHash } });
  }

  async isRefreshTokenValid(user: UserDocument, refreshToken: string): Promise<boolean> {
    if (!user.refreshTokenHash) {
      return false;
    }

    return bcrypt.compare(refreshToken, user.refreshTokenHash);
  }

  toResponse(user: UserDocument): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private ensureObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'INVALID_OBJECT_ID', 'Invalid object id');
    }
  }

  private async enqueueUserOutbox(user: UserDocument): Promise<void> {
    await this.outboxService.enqueue('users.upsert', {
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: this.formatDateTime64(user.createdAt),
      updatedAt: this.formatDateTime64(user.updatedAt),
    });
  }

  private formatDateTime64(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }
}
