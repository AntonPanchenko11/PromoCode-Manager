import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsPositive, Max } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 199.99, minimum: 0.01, maximum: 1_000_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000)
  amount!: number;
}
