import {
  BOOKING_SOURCES,
  BOOKING_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '@travelos/shared';
import type { BookingSource, BookingStatus, PaymentMethod, PaymentStatus } from '@travelos/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { CreateCustomerDto } from '../../customers/dto/customer.dto';
import { PASSENGER_TYPES } from '../entities/booking-passenger.entity';
import type { PassengerType } from '../entities/booking-passenger.entity';

const MONEY = { decimal_digits: '0,2' };

export class PassengerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @IsOptional()
  @IsIn(PASSENGER_TYPES)
  type?: PassengerType;

  @IsOptional()
  @IsDateString({ strict: true })
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  passportNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string;
}

export class PaymentInputDto {
  /** Decimal string, e.g. "250.00" */
  @IsDecimal(MONEY)
  amount!: string;

  @IsIn(PAYMENT_METHODS)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @IsOptional()
  @IsISO8601()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isDeposit?: boolean;
}

export class CreateBookingDto {
  @IsUUID()
  tripId!: string;

  /** Existing customer. Provide either customerId or customer. */
  @ValidateIf((o: CreateBookingDto) => !o.customer)
  @IsUUID()
  customerId?: string;

  /** New customer created in the same transaction. */
  @ValidateIf((o: CreateBookingDto) => !o.customerId)
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer?: CreateCustomerDto;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  adults!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  children?: number;

  /** Total discount for the booking (not per person) */
  @IsOptional()
  @IsDecimal(MONEY)
  discount?: string;

  @IsOptional()
  @IsIn(BOOKING_SOURCES)
  source?: BookingSource;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers?: PassengerDto[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequests?: string;

  /** Record a payment (usually the deposit) together with the booking. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInputDto)
  payment?: PaymentInputDto;

  /** Confirm immediately instead of leaving the booking pending. */
  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequests?: string;

  /** Replaces the passenger list; must match the number of seats. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers?: PassengerDto[];
}

export class CancelBookingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;

  /** Optional refund issued as part of the cancellation. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInputDto)
  refund?: PaymentInputDto;
}

export class RefundDto {
  @IsDecimal(MONEY)
  amount!: string;

  @IsIn(PAYMENT_METHODS)
  method!: PaymentMethod;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;
}

export class BookingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: BookingStatus;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsIn(BOOKING_SOURCES)
  source?: BookingSource;
}
