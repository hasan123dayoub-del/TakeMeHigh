import { PartialType } from '@nestjs/swagger';
import { DISCOUNT_TYPES, REGISTRATION_DECISIONS, SUPPLIER_TYPES, TRIP_STATUSES, TRIP_TYPES } from '@travelos/shared';
import type { DiscountType, RegistrationDecision, SupplierType, TripStatus, TripType } from '@travelos/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

const MONEY = { decimal_digits: '0,2' };

export class TripServiceDto {
  @IsIn(SUPPLIER_TYPES) serviceType!: SupplierType;
  @IsUUID() supplierId!: string;
  /** Net cost per person charged by the supplier, e.g. "200000" */
  @IsDecimal(MONEY) costPerPerson!: string;
  /** Office profit on this service in percent, e.g. "15" */
  @IsDecimal(MONEY) profitPercent!: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
}

export class CreateTripDto {
  @IsUUID() tourId!: string;
  /** Admins choose the branch; Reception-scoped users are always placed in their own branch */
  @IsOptional() @IsUUID() branchId?: string;
  @Matches(/^[A-Za-z0-9-]{2,24}$/, { message: 'code: 2-24 letters, digits or dashes' }) code!: string;
  @IsIn(TRIP_TYPES) tripType!: TripType;
  /** YYYY-MM-DD */
  @IsDateString({ strict: true }) departureDate!: string;
  /** Defaults to departure + the tour's nights */
  @IsOptional() @IsDateString({ strict: true }) returnDate?: string;
  @Length(3, 3) currencyCode!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000) minPassengers!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000) maxSeats!: number;
  @IsDateString({ strict: true }) registrationDeadline!: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => TripServiceDto) services?: TripServiceDto[];
}

export class UpdateTripDto extends PartialType(CreateTripDto) {}

export class ReplaceServicesDto {
  @IsArray() @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => TripServiceDto) services!: TripServiceDto[];
}

export class TripQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() tourId?: string;
  @IsOptional() @IsIn(TRIP_STATUSES) status?: TripStatus;
  @IsOptional() @IsIn(TRIP_TYPES) tripType?: TripType;
  @IsOptional() @IsIn(['upcoming', 'past', 'all']) when?: 'upcoming' | 'past' | 'all';
}

export class RegistrationDecisionDto {
  @IsIn(REGISTRATION_DECISIONS) decision!: RegistrationDecision;
  /** Required for EXTEND: the new last registration day (before departure) */
  @IsOptional() @IsDateString({ strict: true }) newDeadline?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class SetSupervisorsDto {
  @IsArray() @ArrayUnique() @ArrayMaxSize(10) @IsUUID('all', { each: true }) memberIds!: string[];
}

export class CreateOfferDto {
  @IsString() @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsIn(DISCOUNT_TYPES) discountType!: DiscountType;
  /** Percent (0-100) or a fixed amount per person in the trip currency */
  @IsDecimal(MONEY) discountValue!: string;
  @IsDateString({ strict: true }) startsAt!: string;
  @IsDateString({ strict: true }) endsAt!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateOfferDto extends PartialType(CreateOfferDto) {}

export class AttendanceDto {
  @IsBoolean() attended!: boolean;
}
