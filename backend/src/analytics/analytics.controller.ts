import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPromocodesRow } from './dto/analytics-promocodes-row.type';
import { AnalyticsPromoUsagesRow } from './dto/analytics-promo-usages-row.type';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsUsersRow } from './dto/analytics-users-row.type';
import { PaginatedResponse } from './dto/paginated-response.type';

@UseGuards(AccessTokenGuard, ActiveUserGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('users')
  async getUsers(
    @Query() query: AnalyticsQueryDto,
  ): Promise<PaginatedResponse<AnalyticsUsersRow>> {
    return this.analyticsService.getUsers(query);
  }

  @Get('promocodes')
  async getPromocodes(
    @Query() query: AnalyticsQueryDto,
  ): Promise<PaginatedResponse<AnalyticsPromocodesRow>> {
    return this.analyticsService.getPromocodes(query);
  }

  @Get('promo-usages')
  async getPromoUsages(
    @Query() query: AnalyticsQueryDto,
  ): Promise<PaginatedResponse<AnalyticsPromoUsagesRow>> {
    return this.analyticsService.getPromoUsages(query);
  }
}
