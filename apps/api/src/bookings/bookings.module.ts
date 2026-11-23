import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LABELS } from '@travelos/shared';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import {
  ExportService,
  ExportSpec,
  MONEY_FMT,
  num,
} from '../common/export/export.service';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import {
  BookingQueryDto,
  CancelBookingDto,
  CreateBookingDto,
  PaymentQueryDto,
  RecordPaymentDto,
  RefundDto,
  TransferBookingDto,
  UpdatePassengersDto,
  UpdateVisaDto,
  VisaQueryDto,
} from './bookings.dto';
import { BookingsService } from './bookings.service';
import { PaymentsService } from './payments.service';
import { VisasService } from './visas.service';

type BookingRow = Awaited<ReturnType<BookingsService['list']>>['data'][number];
type PaymentRow = Awaited<ReturnType<PaymentsService['list']>>['data'][number];
type VisaRow = Awaited<ReturnType<VisasService['list']>>['data'][number];
const ar = <K extends keyof typeof LABELS>(
  k: K,
  v: string | null | undefined,
) => (v ? ((LABELS[k] as Record<string, { ar: string }>)[v]?.ar ?? v) : '');
const day = (v: Date | string | null | undefined) =>
  v ? new Date(v).toISOString().replace('T', ' ').slice(0, 16) : '';

const BOOKINGS_EXPORT: ExportSpec<BookingRow> = {
  filename: 'bookings',
  title: 'الحجوزات',
  columns: [
    { header: 'رقم الحجز', value: (b) => b.bookingNo, width: 16 },
    { header: 'التاريخ', value: (b) => day(b.createdAt), width: 18 },
    { header: 'الدافع', value: (b) => b.payer?.fullName, width: 24 },
    { header: 'الهاتف', value: (b) => b.payer?.phone },
    { header: 'الحجز على', value: (b) => b.targetTitle, width: 30 },
    { header: 'الركاب', value: (b) => b.passengerCount },
    { header: 'الإجمالي', value: (b) => num(b.totalAmount), numFmt: MONEY_FMT },
    {
      header: 'المدفوع (صافي)',
      value: (b) => num(b.netPaid),
      numFmt: MONEY_FMT,
    },
    { header: 'المتبقي', value: (b) => num(b.balance), numFmt: MONEY_FMT },
    { header: 'العملة', value: (b) => b.currencyCode, width: 8 },
    { header: 'حالة الدفع', value: (b) => ar('paymentState', b.paymentState) },
    { header: 'الحالة', value: (b) => ar('bookingStatus', b.status) },
    { header: 'الفرع', value: (b) => b.branch?.name },
    { header: 'الموظف', value: (b) => b.createdBy?.fullName },
  ],
};

const PAYMENTS_EXPORT: ExportSpec<PaymentRow> = {
  filename: 'payments',
  title: 'الدفعات',
  columns: [
    { header: 'رقم الوصل', value: (p) => p.receiptNo, width: 18 },
    { header: 'التاريخ', value: (p) => day(p.paidAt), width: 18 },
    { header: 'النوع', value: (p) => ar('paymentKind', p.kind) },
    { header: 'الدافع', value: (p) => p.payerName, width: 24 },
    { header: 'رقم الحجز', value: (p) => p.booking?.bookingNo, width: 16 },
    {
      header: 'المبلغ',
      value: (p) => (p.kind === 'REFUND' ? -Number(p.amount) : num(p.amount)),
      numFmt: MONEY_FMT,
    },
    { header: 'العملة', value: (p) => p.currencyCode, width: 8 },
    {
      header: 'المتبقي بعدها',
      value: (p) => num(p.balanceAfter),
      numFmt: MONEY_FMT,
    },
    { header: 'السبب', value: (p) => p.reason, width: 24 },
    { header: 'الفرع', value: (p) => p.branch?.name },
    { header: 'الموظف', value: (p) => p.receivedBy?.fullName },
  ],
};

const VISAS_EXPORT: ExportSpec<VisaRow> = {
  filename: 'visas',
  title: 'التأشيرات',
  columns: [
    {
      header: 'المسافر',
      value: (v) => v.passenger.customer.fullName,
      width: 24,
    },
    { header: 'الهاتف', value: (v) => v.passenger.customer.phone },
    { header: 'الدولة', value: (v) => v.country.nameAr },
    { header: 'رقم الحجز', value: (v) => v.passenger.booking.bookingNo },
    {
      header: 'الرحلة/البرنامج',
      value: (v) =>
        v.passenger.booking.trip?.code ??
        v.passenger.booking.program?.code ??
        v.passenger.booking.offer?.title,
      width: 20,
    },
    { header: 'الجواز', value: (v) => v.passenger.document?.docNumber },
    { header: 'الحالة', value: (v) => ar('visaStatus', v.status) },
    { header: 'رقم التأشيرة', value: (v) => v.visaNumber },
    { header: 'تنتهي', value: (v) => day(v.expiresOn).slice(0, 10) },
    { header: 'الرسم', value: (v) => num(v.fee), numFmt: MONEY_FMT },
  ],
};

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('bookings.view')
  @ApiOperation({
    summary:
      'Bookings of the user’s branch (Admin: all). Supports export=xlsx|all.',
  })
  async list(@CurrentUser() user: AuthUser, @Query() q: BookingQueryDto) {
    return this.exporter.respond(
      q,
      await this.bookings.list(user, q),
      BOOKINGS_EXPORT,
      user,
    );
  }

  @Get(':id')
  @RequirePermissions('bookings.view')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.get(user, id);
  }

  @Post()
  @RequirePermissions('bookings.create')
  @ApiOperation({
    summary:
      '"Add customer" to a trip, program or bundle offer (BKG-01). Starts PENDING; seats are taken on confirm.',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user, dto);
  }

  @Patch(':id/passengers')
  @RequirePermissions('bookings.create')
  updatePassengers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePassengersDto,
  ) {
    return this.bookings.updatePassengers(user, id, dto);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @RequirePermissions('bookings.create')
  @ApiOperation({
    summary:
      'Take the seats atomically; if full the booking joins the waitlist (BKG-05). Also promotes a waitlisted booking.',
  })
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookings.confirm(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermissions('bookings.cancel')
  @ApiOperation({
    summary:
      'Cancel with a reason; frees seats and suggests waitlisted bookings (BKG-09)',
  })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancel(user, id, dto.reason);
  }

  @Post(':id/transfer')
  @HttpCode(200)
  @RequirePermissions('bookings.cancel')
  @ApiOperation({
    summary: 'Move a trip booking to another trip with a new price (BKG-11)',
  })
  transfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferBookingDto,
  ) {
    return this.bookings.transfer(user, id, dto);
  }

  @Post(':id/payments')
  @RequirePermissions('payments.create')
  @ApiOperation({
    summary: 'Record a cash payment; returns the receipt data (PAY-01..04)',
  })
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.payments.record(user, id, dto);
  }
}

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('payments.view')
  @ApiOperation({
    summary:
      'Payments and refunds with per-currency totals. Supports export=xlsx|all.',
  })
  async list(@CurrentUser() user: AuthUser, @Query() q: PaymentQueryDto) {
    return this.exporter.respond(
      q,
      await this.payments.list(user, q),
      PAYMENTS_EXPORT,
      user,
    );
  }

  @Get(':id/receipt')
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'Data printed on the PDF receipt (PAY-04)' })
  receipt(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.receipt(user, id);
  }

  @Post(':id/printed')
  @HttpCode(200)
  @RequirePermissions('payments.view')
  @ApiOperation({
    summary: 'Register a print; later prints are marked "copy" (PAY-08)',
  })
  printed(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.printed(user, id);
  }

  @Post(':id/refund')
  @RequirePermissions('payments.refund')
  @ApiOperation({
    summary: 'Refund (part of) a payment with a reason (PAY-05, PAY-06)',
  })
  refund(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundDto,
  ) {
    return this.payments.refund(user, id, dto);
  }
}

@ApiTags('Visas')
@ApiBearerAuth()
@Controller('visas')
export class VisasController {
  constructor(
    private readonly visas: VisasService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('visas.manage')
  @ApiOperation({
    summary:
      'Visa tracking per passenger; dueSoon=true lists those missing before departure (VIS-03)',
  })
  async list(@CurrentUser() user: AuthUser, @Query() q: VisaQueryDto) {
    return this.exporter.respond(
      q,
      await this.visas.list(user, q),
      VISAS_EXPORT,
      user,
    );
  }

  @Patch(':id')
  @RequirePermissions('visas.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisaDto,
  ) {
    return this.visas.update(user, id, dto);
  }
}

@Module({
  imports: [CustomersModule, ProductsModule],
  controllers: [BookingsController, PaymentsController, VisasController],
  providers: [BookingsService, PaymentsService, VisasService],
  exports: [BookingsService, PaymentsService],
})
export class BookingsModule {}
