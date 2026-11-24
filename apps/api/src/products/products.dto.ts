import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  DECISION_TYPES,
  OFFER_KINDS,
  PRODUCT_STATUSES,
  PROFIT_MODES,
  TRAVEL_SCOPES,
  type DecisionType,
  type OfferKind,
  type ProductStatus,
  type ProfitMode,
  type TravelScope,
} from '@travelos/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EndOfDay, PaginationQueryDto } from '../common/dto/pagination.dto';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;
const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;
const amount = () =>
  Matches(AMOUNT, { message: 'must be an amount with up to 2 decimals' });
const url = () => IsUrl({ require_tld: false, require_protocol: false });

// ------------------------------------------------------------------ trips

export class CreateTripDto {
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsUUID() categoryId!: string;
  /** Omit (Admin) for a trip shared by every branch */
  @IsOptional() @IsUUID() branchId?: string;
  @IsUUID() originCityId!: string;
  @IsUUID() destinationCityId!: string;
  @Type(() => Date) @IsDate() startsAt!: Date;
  @Type(() => Date) @IsDate() endsAt!: Date;
  @Type(() => Date) @IsDate() registrationDeadline!: Date;
  @Type(() => Number) @IsInt() @Min(1) @Max(5000) minPassengers!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5000) maxPassengers!: number;
  @IsString() @Length(3, 3) currencyCode!: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() @url() @MaxLength(500) coverImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(10000) terms?: string;
}
export class UpdateTripDto extends PartialType(
  OmitType(CreateTripDto, ['currencyCode'] as const),
) {}

export class TripQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PRODUCT_STATUSES })
  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: ProductStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ enum: TRAVEL_SCOPES })
  @IsOptional()
  @IsIn(TRAVEL_SCOPES)
  scope?: TravelScope;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional({ description: 'Trips starting on/after' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;
  @ApiPropertyOptional({ description: 'Trips starting on/before' })
  @IsOptional()
  @EndOfDay()
  @IsDate()
  to?: Date;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isPublic?: boolean;
  @ApiPropertyOptional({
    description: 'Only trips whose supplier costs changed (INT-07)',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  costChanged?: boolean;
  @ApiPropertyOptional({
    description: 'Only trips that can still take bookings',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  bookable?: boolean;
}

export class LineDto {
  @IsUUID() companyItemId!: string;
  @Type(() => Date) @IsDate() startsAt!: Date;
  @Type(() => Date) @IsDate() endsAt!: Date;
  /** Hotel/restaurant: the city of the service (defaults to the item's city) */
  @IsOptional() @IsUUID() toCityId?: string;
  /** Nights (hotel) or days (restaurant); defaults from the dates. Transport is always 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  quantity?: number;
  /** Needs pricing.set_profit; otherwise the default profit rule applies (PRC-02) */
  @IsOptional() @IsIn(PROFIT_MODES) profitMode?: ProfitMode;
  @IsOptional() @IsString() @amount() profitValue?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class UpdateLineDto extends PartialType(
  OmitType(LineDto, ['companyItemId'] as const),
) {}

export class PickupPointDto {
  @IsUUID() cityId!: string;
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'pickupTime must be HH:mm' })
  pickupTime?: string;
  @IsOptional() @IsString() @amount() surcharge?: string;
  @IsOptional() @IsString() @MaxLength(255) notes?: string;
}

export class GuidesDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  userIds!: string[];
}

export class CloneTripDto {
  @Type(() => Date) @IsDate() startsAt!: Date;
}

export class DecisionDto {
  @IsIn(DECISION_TYPES) decision!: DecisionType;
  /** Required for EXTEND and REOPEN */
  @IsOptional() @Type(() => Date) @IsDate() newDeadline?: Date;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class CancelProductDto {
  @IsString() @MinLength(3) @MaxLength(255) reason!: string;
}

export class AttendanceDto {
  @IsOptional() @IsIn(['PRESENT', 'ABSENT', null]) attendance?:
    'PRESENT' | 'ABSENT' | null;
  @IsOptional() @IsString() @MaxLength(500) guideNote?: string;
}

export class ImagesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images!: ImageDto[];
}
export class ImageDto {
  @IsString() @url() @MaxLength(500) url!: string;
  @IsOptional() @IsString() @MaxLength(160) caption?: string;
}

// ------------------------------------------------------------------ programs

export class CreateProgramDto {
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsUUID() categoryId!: string;
  @IsOptional() @IsUUID() branchId?: string;
  @Type(() => Date) @IsDate() registrationDeadline!: Date;
  @Type(() => Number) @IsInt() @Min(1) @Max(5000) minPassengers!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5000) maxPassengers!: number;
  /** Trips in travel order (≥ 2) */
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  tripIds!: string[];
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() @url() @MaxLength(500) coverImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(10000) terms?: string;
}
export class UpdateProgramDto extends PartialType(CreateProgramDto) {}

export class ProgramQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PRODUCT_STATUSES })
  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: ProductStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ enum: TRAVEL_SCOPES })
  @IsOptional()
  @IsIn(TRAVEL_SCOPES)
  scope?: TravelScope;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() tripId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  bookable?: boolean;
}

// ------------------------------------------------------------------ offers

export class OfferLineDto {
  @IsUUID() companyItemId!: string;
  /** Nights / days / meals per person */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  quantity?: number;
  @IsOptional() @IsIn(PROFIT_MODES) profitMode?: ProfitMode;
  @IsOptional() @IsString() @amount() profitValue?: string;
}

export class CreateOfferDto {
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsIn(OFFER_KINDS) kind!: OfferKind;
  @IsIn(PROFIT_MODES) discountMode!: ProfitMode;
  @IsString() @amount() discountValue!: string;
  @IsDateString({ strict: true }) validFrom!: string;
  @IsDateString({ strict: true }) validTo!: string;
  /** BUNDLE only (null = unlimited) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  maxSeats?: number;
  /** BUNDLE: ≥ 2 services */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OfferLineDto)
  lines?: OfferLineDto[];
  /** DISCOUNT: trips and/or programs */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  tripIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  programIds?: string[];
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() @url() @MaxLength(500) coverImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(10000) terms?: string;
}
export class UpdateOfferDto extends PartialType(
  OmitType(CreateOfferDto, ['kind'] as const),
) {}

export class OfferQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OFFER_KINDS })
  @IsOptional()
  @IsIn(OFFER_KINDS)
  kind?: OfferKind;
  @ApiPropertyOptional({ description: 'Only offers valid today' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  live?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;
}

export class ActiveDto {
  @IsBoolean() isActive!: boolean;
}

export class PublicDto {
  @IsBoolean() isPublic!: boolean;
}
