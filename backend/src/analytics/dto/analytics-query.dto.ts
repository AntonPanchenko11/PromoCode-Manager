import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ANALYTICS_SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type AnalyticsSortDirection = (typeof ANALYTICS_SORT_DIRECTIONS)[number];

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ example: 'totalSpent', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sortBy?: string;

  @ApiPropertyOptional({ enum: ANALYTICS_SORT_DIRECTIONS, example: 'desc' })
  @IsOptional()
  @IsEnum(ANALYTICS_SORT_DIRECTIONS)
  sortDir?: AnalyticsSortDirection;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z', format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-02-27T23:59:59.000Z', format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'JSON string with column filters',
    example: '{"email":"john","isActive":"true"}',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  filters?: string;
}
