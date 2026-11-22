import { PartialType } from '@nestjs/swagger';
import { TRIP_STATUSES } from '@travelos/shared';
import type { TripStatus } from '@travelos/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const MONEY = { decimal_digits: '0,2' };

export class CreateTripDto {
  /** Short internal code, unique per agency, e.g. CAP-01 */
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'code may contain letters, digits and dashes only' })
  code!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsUUID()
  destinationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** YYYY-MM-DD */
  @IsDateString({ strict: true })
  departureDate!: string;

  /** YYYY-MM-DD, on or after departureDate */
  @IsDateString({ strict: true })
  returnDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  departureLocation?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity!: number;

  /** Price per adult as a decimal string, e.g. "890.00" */
  @IsDecimal(MONEY)
  pricePerPerson!: string;

  @IsOptional()
  @IsDecimal(MONEY)
  childPrice?: string;

  @IsOptional()
  @IsDecimal(MONEY)
  costPerPerson?: string;

  /** Special offer adult price (must be below pricePerPerson). Send null to remove the offer. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDecimal(MONEY)
  offerPrice?: string | null;

  /** e.g. "Early bird", "Family special" */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(60)
  offerLabel?: string | null;

  /** Last day the offer applies (YYYY-MM-DD, inclusive). Empty = until departure. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString({ strict: true })
  offerEndsAt?: string | null;

  @IsOptional()
  @IsIn(TRIP_STATUSES)
  status?: TripStatus;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  inclusions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  exclusions?: string[];
}

export class UpdateTripDto extends PartialType(CreateTripDto) {}

export class TripQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(TRIP_STATUSES)
  status?: TripStatus;

  @IsOptional()
  @IsUUID()
  destinationId?: string;

  /** upcoming = departure today or later; past = already departed */
  @IsOptional()
  @IsIn(['upcoming', 'past', 'all'])
  when?: 'upcoming' | 'past' | 'all';
}

export class ItineraryDayDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  dayNumber!: number;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;
}

export class ReplaceItineraryDto {
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  days!: ItineraryDayDto[];
}

export class AddTripSupplierDto {
  @IsUUID()
  supplierId!: string;

  @IsString()
  @MaxLength(200)
  service!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity!: number;

  @IsDecimal(MONEY)
  unitCost!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateDestinationDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(100)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  imageUrl?: string;
}
