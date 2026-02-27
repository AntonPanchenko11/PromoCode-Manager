import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { E164_PHONE_REGEX } from '../../common/validation/regex';

export class UpdateUserDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(E164_PHONE_REGEX, {
    message: 'phone must be in E.164 format, e.g. +15550001111',
  })
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
