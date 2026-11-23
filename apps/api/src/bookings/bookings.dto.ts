import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  BOOKING_STATUSES,
  PAYMENT_KINDS,
  VISA_STATUSES,
  type BookingStatus,
  type PaymentKind,
  type VisaStatus,
} from '@travelos/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;
const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;

export class PassengerDto {
  @IsUUID() customerId!: string;
  /** Defaults to the document chosen by the travel-document rules (CUS-03) */
  @IsOptional() @IsUUID() documentId?: string;
}

export class CreateBookingDto {
  /** Exactly one of tripId / programId / offerId (BKG-02) */
  @IsOptional() @IsUUID() tripId?: string;
  @IsOptional() @IsUUID() programId?: string;
  @IsOptional() @IsUUID() offerId?: string;
  @IsUUID() payerCustomerId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers!: PassengerDto[];
  /** Alternative boarding point (BR-15) */
  @IsOptional() @IsUUID() pickupPointId?: string;
  /** Admin only: the branch registering the booking for a shared product */
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  /** Admin only: accept a booking after the registration deadline (BKG-06), audited */
  @IsOptional() @IsBoolean() overrideDeadline?: boolean;
}

export class UpdatePassengersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers!: PassengerDto[];
  @IsOptional() @IsUUID() pickupPointId?: string | null;
}

export class CancelBookingDto {
  @IsString() @MinLength(3) @MaxLength(255) reason!: string;
}

export class TransferBookingDto {
  @IsUUID() toTripId!: string;
  @IsOptional() @IsString() @MaxLength(255) note?: string;
}

export class BookingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BOOKING_STATUSES })
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: BookingStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() tripId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() programId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() offerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional({ enum: ['UNPAID', 'PARTIAL', 'PAID'] })
  @IsOptional()
  @IsIn(['UNPAID', 'PARTIAL', 'PAID'])
  paymentState?: 'UNPAID' | 'PARTIAL' | 'PAID';
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}

// ------------------------------------------------------------------ payments

export class RecordPaymentDto {
  @IsString()
  @Matches(AMOUNT, { message: 'amount must have up to 2 decimals' })
  amount!: string;
  @IsOptional() @IsIn(['CASH']) method?: 'CASH';
  /** Defaults to the booking's payer */
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) payerName?: string;
  @IsOptional() @Type(() => Date) @IsDate() paidAt?: Date;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  /** Sent by the client so a double click records one payment (PAY-10) */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  idempotencyKey?: string;
}

export class RefundDto {
  @IsString()
  @Matches(AMOUNT, { message: 'amount must have up to 2 decimals' })
  amount!: string;
  @IsString() @MinLength(3) @MaxLength(255) reason!: string;
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  idempotencyKey?: string;
}

export class PaymentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PAYMENT_KINDS })
  @IsOptional()
  @IsIn(PAYMENT_KINDS)
  kind?: PaymentKind;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() bookingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() receivedById?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencyCode?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}

// ------------------------------------------------------------------ visas

export class UpdateVisaDto {
  @IsOptional() @IsIn(VISA_STATUSES) status?: VisaStatus;
  @IsOptional() @IsString() @MaxLength(60) visaNumber?: string;
  @IsOptional() @IsDateString({ strict: true }) expiresOn?: string;
  @IsOptional() @IsString() @Matches(AMOUNT) fee?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class VisaQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VISA_STATUSES })
  @IsOptional()
  @IsIn(VISA_STATUSES)
  status?: VisaStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() tripId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() programId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional({
    description:
      'Only visas not approved for trips departing within the warning window (VIS-03)',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  dueSoon?: boolean;
}
