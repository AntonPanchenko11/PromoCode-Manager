import { ApiProperty } from '@nestjs/swagger';

export class OrderResponseDto {
  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c201' })
  id!: string;

  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c001' })
  userId!: string;

  @ApiProperty({ example: 199.99 })
  amount!: number;

  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c101', nullable: true })
  promocodeId!: string | null;

  @ApiProperty({ example: 'SUMMER2026', nullable: true })
  promocodeCode!: string | null;

  @ApiProperty({ example: 30.0 })
  discountAmount!: number;

  @ApiProperty({ example: 169.99 })
  finalAmount!: number;

  @ApiProperty({ example: '2026-02-27T13:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-02-27T13:10:00.000Z' })
  updatedAt!: string;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items!: OrderResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 42 })
  total!: number;
}
