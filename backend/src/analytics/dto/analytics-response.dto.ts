import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsUsersRowDto {
  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c001' })
  userId!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: '+15550001111' })
  phone!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 7 })
  ordersCount!: number;

  @ApiProperty({ example: 1450.5 })
  totalSpent!: number;

  @ApiProperty({ example: 120.75 })
  totalDiscount!: number;

  @ApiProperty({ example: 3 })
  usedPromocodesCount!: number;

  @ApiProperty({ example: '2026-01-10T09:30:00.000Z' })
  createdAt!: string;
}

export class AnalyticsPromocodesRowDto {
  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c101' })
  promocodeId!: string;

  @ApiProperty({ example: 'SUMMER2026' })
  code!: string;

  @ApiProperty({ example: 15 })
  discountPercent!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 1000 })
  usageLimitTotal!: number;

  @ApiProperty({ example: 1 })
  usageLimitPerUser!: number;

  @ApiProperty({ example: 140 })
  usagesCount!: number;

  @ApiProperty({ example: 22500.75 })
  revenue!: number;

  @ApiProperty({ example: 132 })
  uniqueUsers!: number;

  @ApiProperty({ example: 3100.5 })
  totalDiscount!: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: string;
}

export class AnalyticsPromoUsagesRowDto {
  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c301' })
  usageId!: string;

  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c201' })
  orderId!: string;

  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c001' })
  userId!: string;

  @ApiProperty({ example: 'John Doe' })
  userName!: string;

  @ApiProperty({ example: 'user@example.com' })
  userEmail!: string;

  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c101' })
  promocodeId!: string;

  @ApiProperty({ example: 'SUMMER2026' })
  promocodeCode!: string;

  @ApiProperty({ example: 199.99 })
  orderAmount!: number;

  @ApiProperty({ example: 30.0 })
  discountAmount!: number;

  @ApiProperty({ example: '2026-02-20T12:34:56.000Z' })
  usedAt!: string;
}

export class PaginatedAnalyticsUsersResponseDto {
  @ApiProperty({ type: [AnalyticsUsersRowDto] })
  items!: AnalyticsUsersRowDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 250 })
  total!: number;
}

export class PaginatedAnalyticsPromocodesResponseDto {
  @ApiProperty({ type: [AnalyticsPromocodesRowDto] })
  items!: AnalyticsPromocodesRowDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 35 })
  total!: number;
}

export class PaginatedAnalyticsPromoUsagesResponseDto {
  @ApiProperty({ type: [AnalyticsPromoUsagesRowDto] })
  items!: AnalyticsPromoUsagesRowDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 1250 })
  total!: number;
}
