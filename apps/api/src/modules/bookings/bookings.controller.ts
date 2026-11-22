import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth.types';
import { AgencyId, CurrentUser, RequirePermission } from '../../common/decorators';
import { BookingsService } from './bookings.service';
import {
  BookingQueryDto,
  CancelBookingDto,
  CreateBookingDto,
  PaymentInputDto,
  RefundDto,
  UpdateBookingDto,
} from './dto/booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @RequirePermission('bookings.read')
  @ApiOperation({ summary: 'List bookings (filter by status, payment status, trip, customer, source, search)' })
  list(@AgencyId() agencyId: string, @Query() q: BookingQueryDto) {
    return this.bookings.list(agencyId, q);
  }

  @Get(':id')
  @RequirePermission('bookings.read')
  @ApiOperation({ summary: 'Booking with trip, customer, passengers, payments and refunds' })
  findOne(@AgencyId() agencyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.findOne(agencyId, id);
  }

  @Get(':id/confirmation')
  @RequirePermission('bookings.read')
  @ApiOperation({ summary: 'Data for the printable booking confirmation document' })
  confirmation(@AgencyId() agencyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.confirmation(agencyId, id);
  }

  @Post()
  @RequirePermission('bookings.write')
  @ApiOperation({
    summary: 'Create a booking. Seats are reserved atomically; returns 409 when not enough seats are left.',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create({ agencyId: user.agencyId, userId: user.userId }, dto);
  }

  @Patch(':id')
  @RequirePermission('bookings.write')
  @ApiOperation({ summary: 'Update notes, special requests or passenger names' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBookingDto) {
    return this.bookings.update(user, id, dto);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @RequirePermission('bookings.write')
  confirm(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.confirm(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermission('bookings.write')
  @ApiOperation({ summary: 'Cancel, release seats and optionally refund, in one transaction' })
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelBookingDto) {
    return this.bookings.cancel(user, id, dto);
  }

  @Post(':id/payments')
  @RequirePermission('payments.write')
  @ApiOperation({ summary: 'Record a payment. Cannot exceed the balance; reaching the deposit confirms the booking.' })
  addPayment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PaymentInputDto) {
    return this.bookings.addPayment(user, id, dto);
  }

  @Post(':id/refunds')
  @RequirePermission('finance.write')
  @ApiOperation({ summary: 'Issue a refund (cannot exceed what was paid)' })
  addRefund(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RefundDto) {
    return this.bookings.addRefund(user, id, dto);
  }
}
