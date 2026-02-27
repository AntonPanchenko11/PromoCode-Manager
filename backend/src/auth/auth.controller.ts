import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { AuthUser } from '../common/types/auth-user.type';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthService } from './auth.service';
import { AuthResponseDto, LogoutResponseDto, RefreshResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Login by email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Refresh access token pair' })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto): Promise<RefreshResponseDto> {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @UseGuards(AccessTokenGuard, ActiveUserGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return this.authService.me(user);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout current user and revoke refresh token hash' })
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @UseGuards(AccessTokenGuard, ActiveUserGuard)
  @Post('logout')
  async logout(@CurrentUser() user: AuthUser): Promise<LogoutResponseDto> {
    await this.authService.logout(user);
    return { success: true };
  }
}
