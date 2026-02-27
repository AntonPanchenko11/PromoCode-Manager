import { ApiProperty } from '@nestjs/swagger';

export class PromocodeResponseDto {
  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c101' })
  id!: string;

  @ApiProperty({ example: 'SUMMER2026' })
  code!: string;

  @ApiProperty({ example: 15 })
  discountPercent!: number;

  @ApiProperty({ example: 1000 })
  usageLimitTotal!: number;

  @ApiProperty({ example: 1 })
  usageLimitPerUser!: number;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z', nullable: true })
  dateFrom!: string | null;

  @ApiProperty({ example: '2026-06-30T23:59:59.000Z', nullable: true })
  dateTo!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-02-27T13:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-02-27T13:10:00.000Z' })
  updatedAt!: string;
}
