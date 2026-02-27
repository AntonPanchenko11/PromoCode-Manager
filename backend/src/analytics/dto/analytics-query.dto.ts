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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sortBy?: string;

  @IsOptional()
  @IsEnum(ANALYTICS_SORT_DIRECTIONS)
  sortDir?: AnalyticsSortDirection;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  filters?: string;
}
