import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ValidationErrorFieldDto {
  @ApiProperty({ example: 'email' })
  field!: string;

  @ApiProperty({ example: 'email must be an email' })
  message!: string;
}

class ErrorDetailsDto {
  @ApiPropertyOptional({ type: [ValidationErrorFieldDto] })
  fields?: ValidationErrorFieldDto[];
}

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiPropertyOptional({ type: ErrorDetailsDto })
  details?: ErrorDetailsDto;

  @ApiProperty({ example: '2026-02-27T13:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/auth/login' })
  path!: string;
}
