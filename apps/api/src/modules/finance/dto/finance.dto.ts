import { PartialType } from '@nestjs/swagger';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@travelos/shared';
import type { ExpenseCategory, PaymentMethod } from '@travelos/shared';
import { IsDateString, IsDecimal, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class DateRangeQueryDto extends PaginationQueryDto {
  /** YYYY-MM-DD (inclusive) */
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  /** YYYY-MM-DD (inclusive) */
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;
}

export class PaymentQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  method?: PaymentMethod;
}

export class ExpenseQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsIn(EXPENSE_CATEGORIES)
  category?: ExpenseCategory;

  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

export class CreateExpenseDto {
  @IsIn(EXPENSE_CATEGORIES)
  category!: ExpenseCategory;

  @IsString()
  @MaxLength(200)
  description!: string;

  @IsDecimal({ decimal_digits: '0,2' })
  amount!: string;

  @IsDateString({ strict: true })
  expenseDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
