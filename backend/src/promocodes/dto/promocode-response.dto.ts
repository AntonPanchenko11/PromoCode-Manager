export class PromocodeResponseDto {
  id!: string;
  code!: string;
  discountPercent!: number;
  usageLimitTotal!: number;
  usageLimitPerUser!: number;
  dateFrom!: string | null;
  dateTo!: string | null;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;
}
