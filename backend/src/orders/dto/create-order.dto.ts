import { Type } from 'class-transformer';
import { IsNumber, IsPositive, Max } from 'class-validator';

export class CreateOrderDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000)
  amount!: number;
}
