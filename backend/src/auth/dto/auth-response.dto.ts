import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class RefreshResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
  })
  refreshToken!: string;
}

export class AuthResponseDto extends RefreshResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: true;
}
