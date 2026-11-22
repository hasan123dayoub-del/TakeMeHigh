import { ROLES } from '@travelos/shared';
import type { Role } from '@travelos/shared';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDecimal,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AgencySettingsDto {
  @IsOptional() @IsBoolean()
  publicPageEnabled?: boolean;

  @IsOptional() @IsString() @MaxLength(160)
  publicTagline?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  publicDescription?: string;

  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(500)
  heroImageUrl?: string;

  @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/)
  brandColor?: string;

  @IsOptional() @IsDecimal({ decimal_digits: '0,2' })
  depositPercent?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(120)
  balanceDueDaysBeforeDeparture?: number;

  @IsOptional() @IsString() @MaxLength(40)
  whatsappNumber?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  bookingTerms?: string;
}

export class UpdateAgencyDto {
  @IsOptional() @IsString() @MaxLength(150)
  name?: string;

  @IsOptional() @IsEmail() @MaxLength(190)
  email?: string;

  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(255)
  address?: string;

  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @IsOptional() @IsString() @MaxLength(100)
  country?: string;

  @IsOptional() @IsString() @Length(3, 3)
  currency?: string;

  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(500)
  logoUrl?: string;

  @IsOptional() @IsString() @MaxLength(60)
  licenseNumber?: string;

  @IsOptional() @ValidateNested() @Type(() => AgencySettingsDto)
  settings?: AgencySettingsDto;
}

export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(120)
  fullName!: string;

  @IsEmail() @MaxLength(190)
  email!: string;

  /** At least 8 characters with a letter and a digit. */
  @IsString() @MinLength(8) @MaxLength(128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'password must contain a letter and a digit' })
  password!: string;

  @IsIn(ROLES)
  role!: Role;

  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  fullName?: string;

  @IsOptional() @IsIn(ROLES)
  role?: Role;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;
}
