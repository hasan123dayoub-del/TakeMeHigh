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
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { assertBranchAccess, branchWhere, officeUser } from '../common/scope';
import { CustomersModule } from '../customers/customers.module';
import { PrismaService } from '../prisma/prisma.service';
import { TripsModule } from '../trips/trips.controller';
import {
  BookingQueryDto,
  CancelBookingDto,
  CreateBookingDto,
  RecordPaymentDto,
  RecordRefundDto,
  TransferBookingDto,
  UpdateBookingDto,
} from './bookings.dto';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @RequirePermissions('bookings.view')
  @ApiOperation({
    summary:
      'Bookings in scope (status, trip, customer, branch; search reference/customer/phone/passenger)',
  })
  list(@CurrentUser() user: AuthUser, @Query() q: BookingQueryDto) {
    return this.bookings.list(user, q);
  }

  @Get(':id')
  @RequirePermissions('bookings.view')
  @ApiOperation({
    summary:
      'Booking with passengers, payments+refunds, history and external reservation statuses',
  })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.get(user, id);
  }

  @Post()
  @RequirePermissions('bookings.create')
  @ApiOperation({
    summary:
      'Create a booking (prices from the server; PENDING takes no seats; confirm=true takes them atomically)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('bookings.edit')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookings.update(user, id, dto);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @RequirePermissions('bookings.confirm')
  @ApiOperation({
    summary: 'Confirm (takes seats; 409 when not enough seats remain)',
  })
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookings.confirm(user, id);
  }

  @Post(':id/waitlist')
  @HttpCode(200)
  @RequirePermissions('bookings.edit')
  waitlist(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookings.waitlist(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermissions('bookings.cancel')
  @ApiOperation({
    summary:
      'Cancel (releases seats if confirmed; payment history is kept for manual refunds)',
  })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancel(user, id, dto);
  }

  @Post(':id/transfer')
  @HttpCode(200)
  @RequirePermissions('bookings.transfer')
  @ApiOperation({
    summary:
      'Move to another trip (same office/branch scope and currency); history keeps the old price',
  })
  transfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferBookingDto,
  ) {
    return this.bookings.transfer(user, id, dto);
  }

  @Post(':id/payments')
  @RequirePermissions('payments.record')
  @ApiOperation({
    summary:
      'Record a cash payment in the booking currency (never above the balance)',
  })
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.bookings.recordPayment(user, id, dto);
  }
}

@ApiTags('Payments & refunds')
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('payments')
  @RequirePermissions('payments.view')
  async list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const where = {
      ...branchWhere(user),
      ...(q.search
        ? {
            OR: [
              {
                receiptNumber: {
                  contains: q.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                booking: {
                  reference: {
                    contains: q.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              reference: true,
              customer: { select: { fullName: true } },
              trip: { select: { code: true } },
            },
          },
          recordedBy: { select: { user: { select: { fullName: true } } } },
        },
        orderBy: { paidAt: q.order === 'ASC' ? 'asc' : 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return paginate(rows, total, q.page, q.pageSize);
  }

  @Get('payments/:id/receipt')
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'Data for the printable cash receipt' })
  async receipt(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const p = await this.prisma.payment.findFirst({
      where: { id, officeId: officeUser(user).officeId },
      include: {
        office: {
          select: { name: true, phone: true, address: true, logoUrl: true },
        },
        branch: { select: { name: true } },
        booking: {
          select: {
            reference: true,
            totalAmount: true,
            paidAmount: true,
            currencyCode: true,
            customer: { select: { fullName: true, phone: true } },
            trip: {
              select: {
                code: true,
                departureDate: true,
                tour: { select: { name: true } },
              },
            },
          },
        },
        refunds: true,
        recordedBy: { select: { user: { select: { fullName: true } } } },
      },
    });
    assertBranchAccess(user, p, 'Payment');
    return p;
  }

  @Post('payments/:id/refunds')
  @RequirePermissions('refunds.record')
  @ApiOperation({
    summary:
      'Manual refund linked to this payment (partial allowed, never above what remains refundable)',
  })
  refund(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordRefundDto,
  ) {
    return this.bookings.recordRefund(user, id, dto.amount, dto.reason);
  }

  @Get('refunds')
  @RequirePermissions('payments.view')
  async refunds(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const u = officeUser(user);
    const where = {
      officeId: u.officeId,
      ...(u.scope === 'BRANCH' ? { booking: { branchId: u.branchId } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.refund.findMany({
        where,
        include: {
          payment: { select: { receiptNumber: true } },
          booking: {
            select: {
              id: true,
              reference: true,
              customer: { select: { fullName: true } },
            },
          },
          recordedBy: { select: { user: { select: { fullName: true } } } },
        },
        orderBy: { refundedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.refund.count({ where }),
    ]);
    return paginate(rows, total, q.page, q.pageSize);
  }
}

@Module({
  imports: [CustomersModule, TripsModule],
  controllers: [BookingsController, PaymentsController],
  providers: [BookingsService],
})
export class BookingsModule {}
