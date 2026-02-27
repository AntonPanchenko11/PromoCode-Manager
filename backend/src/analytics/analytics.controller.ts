import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPromocodesRow } from './dto/analytics-promocodes-row.type';
import { AnalyticsPromoUsagesRow } from './dto/analytics-promo-usages-row.type';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import {
  PaginatedAnalyticsPromocodesResponseDto,
  PaginatedAnalyticsPromoUsagesResponseDto,
  PaginatedAnalyticsUsersResponseDto,
} from './dto/analytics-response.dto';
import { AnalyticsUsersRow } from './dto/analytics-users-row.type';
import { PaginatedResponse } from './dto/paginated-response.type';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, ActiveUserGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Users analytics table (ClickHouse)' })
  @ApiOkResponse({ type: PaginatedAnalyticsUsersResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Get('users')
  async getUsers(
    @Query() query: AnalyticsQueryDto,
  ): Promise<PaginatedResponse<AnalyticsUsersRow>> {
    return this.analyticsService.getUsers(query);
  }

  @ApiOperation({ summary: 'Promocodes analytics table (ClickHouse)' })
  @ApiOkResponse({ type: PaginatedAnalyticsPromocodesResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Get('promocodes')
  async getPromocodes(
    @Query() query: AnalyticsQueryDto,
  ): Promise<PaginatedResponse<AnalyticsPromocodesRow>> {
    return this.analyticsService.getPromocodes(query);
  }

  @ApiOperation({ summary: 'Promocode usages history table (ClickHouse)' })
  @ApiOkResponse({ type: PaginatedAnalyticsPromoUsagesResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Get('promo-usages')
  async getPromoUsages(
    @Query() query: AnalyticsQueryDto,
  ): Promise<PaginatedResponse<AnalyticsPromoUsagesRow>> {
    return this.analyticsService.getPromoUsages(query);
  }
}
