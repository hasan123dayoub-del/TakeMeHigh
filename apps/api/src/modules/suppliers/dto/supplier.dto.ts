import { PartialType } from '@nestjs/swagger';
import { SUPPLIER_TYPES } from '@travelos/shared';
import type { SupplierType } from '@travelos/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDecimal,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { VEHICLE_TYPES } from '../entities/transportation-details.entity';
import type { VehicleType } from '../entities/transportation-details.entity';

const MONEY = { decimal_digits: '0,2' };
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class HotelDetailsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(7)
  starRating?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  totalRooms?: number;

  @IsOptional() @IsDecimal(MONEY)
  nightlyRate?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true })
  roomTypes?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  amenities?: string[];

  @IsOptional() @Matches(TIME)
  checkInTime?: string;

  @IsOptional() @Matches(TIME)
  checkOutTime?: string;
}

export class TransportDetailsDto {
  @IsOptional() @IsIn(VEHICLE_TYPES)
  vehicleType?: VehicleType;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000)
  fleetSize?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000)
  seatsPerVehicle?: number;

  @IsOptional() @IsDecimal(MONEY)
  dailyRate?: string;

  @IsOptional() @IsString() @MaxLength(60)
  licenseNumber?: string;
}

export class CreateSupplierDto {
  @IsIn(SUPPLIER_TYPES)
  type!: SupplierType;

  @IsString() @MaxLength(150)
  name!: string;

  @IsOptional() @IsString() @MaxLength(120)
  contactName?: string;

  @IsOptional() @IsEmail() @MaxLength(190)
  email?: string;

  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @IsOptional() @IsString() @MaxLength(100)
  country?: string;

  @IsOptional() @IsString() @MaxLength(255)
  address?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating?: number;

  @IsOptional() @IsString() @MaxLength(5000)
  notes?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  /** Only for type HOTEL */
  @IsOptional() @ValidateNested() @Type(() => HotelDetailsDto)
  hotel?: HotelDetailsDto;

  /** Only for type TRANSPORT */
  @IsOptional() @ValidateNested() @Type(() => TransportDetailsDto)
  transport?: TransportDetailsDto;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class SupplierQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(SUPPLIER_TYPES)
  type?: SupplierType;
}
