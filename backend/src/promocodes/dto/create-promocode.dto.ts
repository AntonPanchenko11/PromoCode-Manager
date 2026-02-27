import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';

export class CreatePromocodeDto {
  @ApiProperty({ example: 'SUMMER2026', minLength: 3, maxLength: 32 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 15, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent!: number;

  @ApiProperty({ example: 1000, minimum: 1, maximum: 1_000_000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  usageLimitTotal!: number;

  @ApiProperty({ example: 1, minimum: 1, maximum: 10_000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  usageLimitPerUser!: number;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.000Z', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
