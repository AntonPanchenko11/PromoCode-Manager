export class OrderResponseDto {
  id!: string;
  userId!: string;
  amount!: number;
  promocodeId!: string | null;
  promocodeCode!: string | null;
  discountAmount!: number;
  finalAmount!: number;
  createdAt!: string;
  updatedAt!: string;
}

export class PaginatedOrdersResponseDto {
  items!: OrderResponseDto[];
  page!: number;
  pageSize!: number;
  total!: number;
}
