import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '65f5c2c65f9f6b2a8b88c001' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: '+15550001111' })
  phone!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-02-27T13:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-02-27T13:10:00.000Z' })
  updatedAt!: string;
}
