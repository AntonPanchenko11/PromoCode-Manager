import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePromocodeDto {
  @ApiPropertyOptional({ example: 'SUMMER2026', minLength: 3, maxLength: 32 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 2000, minimum: 1, maximum: 1_000_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  usageLimitTotal?: number;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 10_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  usageLimitPerUser?: number;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z', nullable: true, format: 'date-time' })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsDateString()
  dateFrom?: string | null;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.000Z', nullable: true, format: 'date-time' })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsDateString()
  dateTo?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
