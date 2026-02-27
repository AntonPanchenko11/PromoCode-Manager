import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppError } from '../common/errors/app-error';
import { AuthUser } from '../common/types/auth-user.type';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

type JwtPayload = {
  sub: string;
  email: string;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.createWithPassword({
      email: dto.email,
      name: dto.name,
      phone: dto.phone,
      password: dto.password,
      isActive: true,
    });

    const tokens = await this.issueTokens(user);
    await this.usersService.setRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.usersService.toResponse(user),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithSecrets(dto.email);
    if (!user) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new AppError(HttpStatus.FORBIDDEN, 'USER_INACTIVE', 'User is inactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const tokens = await this.issueTokens(user);
    await this.usersService.setRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.usersService.toResponse(user),
    };
  }

  async refresh(dto: RefreshDto): Promise<TokenPair> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'change_me_refresh_secret'),
      });
    } catch {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'AUTH_TOKEN_EXPIRED', 'Refresh token is invalid or expired');
    }

    const user = await this.usersService.findByIdWithSecrets(payload.sub);
    if (!user || !user.isActive) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'AUTH_TOKEN_INVALID', 'Refresh token is invalid');
    }

    const isTokenValid = await this.usersService.isRefreshTokenValid(user, dto.refreshToken);
    if (!isTokenValid) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'AUTH_TOKEN_INVALID', 'Refresh token is invalid');
    }

    const tokens = await this.issueTokens(user);
    await this.usersService.setRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async me(authUser: AuthUser): Promise<UserResponseDto> {
    const user = await this.usersService.findByIdOrFail(authUser.userId);
    return this.usersService.toResponse(user);
  }

  async logout(authUser: AuthUser): Promise<void> {
    await this.usersService.setRefreshTokenHash(authUser.userId, null);
  }

  private async issueTokens(user: UserDocument): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'change_me_access_secret'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_TTL', '15m'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'change_me_refresh_secret'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_TTL', '7d'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
