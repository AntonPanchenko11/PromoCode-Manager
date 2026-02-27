import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

type LogoutResponse = {
  success: true;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto): Promise<RefreshResponse> {
    return this.authService.refresh(dto);
  }

  @UseGuards(AccessTokenGuard, ActiveUserGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return this.authService.me(user);
  }

  @UseGuards(AccessTokenGuard, ActiveUserGuard)
  @Post('logout')
  async logout(@CurrentUser() user: AuthUser): Promise<LogoutResponse> {
    await this.authService.logout(user);
    return { success: true };
  }
}
