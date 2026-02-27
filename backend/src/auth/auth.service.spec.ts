import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppError } from '../common/errors/app-error';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    usersService = {
      createWithPassword: jest.fn(),
      setRefreshTokenHash: jest.fn(),
      toResponse: jest.fn(),
      findByEmailWithSecrets: jest.fn(),
      findByIdWithSecrets: jest.fn(),
      isRefreshTokenValid: jest.fn(),
      findByIdOrFail: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? ''),
    } as unknown as jest.Mocked<ConfigService>;

    authService = new AuthService(usersService, jwtService, configService);
  });

  it('registers user and returns token pair', async () => {
    usersService.createWithPassword.mockResolvedValue({
      id: 'user-id-1',
      email: 'user@example.com',
      isActive: true,
    } as never);
    usersService.toResponse.mockReturnValue({
      id: 'user-id-1',
      email: 'user@example.com',
      name: 'Anton',
      phone: '+15550001111',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await authService.register({
      email: 'user@example.com',
      name: 'Anton',
      phone: '+15550001111',
      password: 'strongPass123',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.email).toBe('user@example.com');
    expect(usersService.setRefreshTokenHash).toHaveBeenCalledWith('user-id-1', 'refresh-token');
  });

  it('clears refresh token hash on logout', async () => {
    usersService.setRefreshTokenHash.mockResolvedValue(undefined);

    await authService.logout({
      userId: 'user-id-1',
      email: 'user@example.com',
    });

    expect(usersService.setRefreshTokenHash).toHaveBeenCalledWith('user-id-1', null);
  });

  it('throws AUTH_INVALID_CREDENTIALS when user not found on login', async () => {
    usersService.findByEmailWithSecrets.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'strongPass123',
      }),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'strongPass123',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AUTH_INVALID_CREDENTIALS',
      }),
    });
  });

  it('throws AUTH_TOKEN_EXPIRED when refresh token verification fails', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(
      authService.refresh({
        refreshToken: 'invalid-refresh-token',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AUTH_TOKEN_EXPIRED',
      }),
    });
  });

  it('throws AUTH_TOKEN_INVALID when refresh token hash does not match', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id-1',
      email: 'user@example.com',
    });
    usersService.findByIdWithSecrets.mockResolvedValue({
      id: 'user-id-1',
      email: 'user@example.com',
      isActive: true,
      refreshTokenHash: '$2b$10$hash',
    } as never);
    usersService.isRefreshTokenValid.mockResolvedValue(false);

    await expect(
      authService.refresh({
        refreshToken: 'refresh-token',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AUTH_TOKEN_INVALID',
      }),
    });
  });
});
