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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  usageLimitTotal!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  usageLimitPerUser!: number;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
