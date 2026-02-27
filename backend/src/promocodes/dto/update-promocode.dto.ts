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
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  usageLimitTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  usageLimitPerUser?: number;

  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsDateString()
  dateFrom?: string | null;

  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsDateString()
  dateTo?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
