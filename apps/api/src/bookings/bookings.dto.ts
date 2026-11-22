import { BOOKING_STATUSES, DOCUMENT_TYPES } from '@travelos/shared';
import type { BookingStatus, DocumentType } from '@travelos/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { CreateCustomerDto } from '../customers/customers.module';

export class PassengerDto {
  @IsString() @MinLength(2) @MaxLength(160) fullName!: string;
  @IsOptional() @IsDateString({ strict: true }) dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(80) nationality?: string;
  @IsOptional() @IsIn(DOCUMENT_TYPES) documentType?: DocumentType;
  @IsOptional() @IsString() @MaxLength(40) documentNumber?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class InitialPaymentDto {
  @IsDecimal({ decimal_digits: '0,2' }) amount!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CreateBookingDto {
  @IsUUID() tripId!: string;

  /** Existing customer (the booking owner / contact) — or `customer` to create one */
  @ValidateIf((o: CreateBookingDto) => !o.customer)
  @IsUUID()
  customerId?: string;
  @ValidateIf((o: CreateBookingDto) => !o.customerId)
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer?: CreateCustomerDto;

  /** One record per traveller; the passenger count is the length of this list */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers!: PassengerDto[];

  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
  /** Try to confirm immediately (takes seats). Default: the booking stays PENDING (no seats). */
  @IsOptional() @IsBoolean() confirm?: boolean;
  /** With confirm: put the booking on the waiting list instead of failing when the trip is full */
  @IsOptional() @IsBoolean() waitlistIfFull?: boolean;
  /** Optional first cash payment, in the trip currency */
  @IsOptional()
  @ValidateNested()
  @Type(() => InitialPaymentDto)
  payment?: InitialPaymentDto;
}

export class UpdateBookingDto {
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
  /**
   * Replace the passenger records. A confirmed booking must keep the same number of passengers
   * (seats are held); pending / waiting-list bookings may change it and are re-totalled with
   * their original price snapshot.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers?: PassengerDto[];
}

export class CancelBookingDto {
  @IsString() @MinLength(3) @MaxLength(255) reason!: string;
}

export class TransferBookingDto {
  @IsUUID() targetTripId!: string;
  @IsOptional() @IsString() @MaxLength(255) reason?: string;
}

export class BookingQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(BOOKING_STATUSES) status?: BookingStatus;
  @IsOptional() @IsUUID() tripId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() branchId?: string;
}

export class RecordPaymentDto {
  @IsDecimal({ decimal_digits: '0,2' }) amount!: string;
  /** Must equal the booking currency (mixed-currency payments are not supported) */
  @Length(3, 3) currencyCode!: string;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class RecordRefundDto {
  @IsDecimal({ decimal_digits: '0,2' }) amount!: string;
  @IsString() @MinLength(3) @MaxLength(255) reason!: string;
}
