import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import {
  AttendanceDto,
  CreateOfferDto,
  CreateTripDto,
  RegistrationDecisionDto,
  ReplaceServicesDto,
  SetSupervisorsDto,
  TripQueryDto,
  UpdateOfferDto,
  UpdateTripDto,
} from './trips.dto';
import { TripsService } from './trips.service';

@ApiTags('Trips (scheduled runs)')
@ApiBearerAuth()
@Controller()
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('trips')
  @RequirePermissions('trips.view')
  @ApiOperation({
    summary:
      "Trips in the user's scope (all branches for Admin, own branch for Reception)",
  })
  list(@CurrentUser() user: AuthUser, @Query() q: TripQueryDto) {
    return this.trips.list(user, q);
  }

  @Get('trips/:id')
  @RequirePermissions('trips.view')
  @ApiOperation({
    summary:
      'Trip with services, price breakdown, offers, supervisors, decisions and financials',
  })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trips.get(user, id);
  }

  @Post('trips')
  @RequirePermissions('trips.manage')
  @ApiOperation({
    summary:
      'Schedule a trip from a tour (draft). Selling price = Σ cost × (1 + profit%).',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(user, dto);
  }

  @Patch('trips/:id')
  @RequirePermissions('trips.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.update(user, id, dto);
  }

  @Put('trips/:id/services')
  @RequirePermissions('trips.manage')
  @ApiOperation({
    summary:
      'Set the hotel / transport / restaurant services (one each). Existing bookings keep their prices.',
  })
  replaceServices(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceServicesDto,
  ) {
    return this.trips.replaceServices(user, id, dto);
  }

  @Post('trips/:id/open')
  @HttpCode(200)
  @RequirePermissions('trips.manage')
  @ApiOperation({ summary: 'Open registration (requires priced services)' })
  open(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trips.open(user, id);
  }

  @Post('trips/:id/unpublish')
  @HttpCode(200)
  @RequirePermissions('trips.manage')
  unpublish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trips.unpublish(user, id);
  }

  @Post('trips/:id/complete')
  @HttpCode(200)
  @RequirePermissions('trips.manage')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trips.complete(user, id);
  }

  @Post('trips/:id/decision')
  @HttpCode(200)
  @RequirePermissions('trips.decide')
  @ApiOperation({
    summary:
      'After the registration deadline: APPROVE, CANCEL (cancels all bookings) or EXTEND',
  })
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrationDecisionDto,
  ) {
    return this.trips.decide(user, id, dto);
  }

  @Put('trips/:id/supervisors')
  @RequirePermissions('trips.manage')
  setSupervisors(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetSupervisorsDto,
  ) {
    return this.trips.setSupervisors(user, id, dto);
  }

  @Get('trips/:id/passengers')
  @RequirePermissions('trips.view')
  @ApiOperation({
    summary: 'Passenger manifest: every passenger of confirmed bookings',
  })
  async passengers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const trip = await this.trips.owned(user, id, {
      tour: { select: { name: true } },
    });
    const rows = await this.prisma.bookingPassenger.findMany({
      where: { booking: { tripId: id, status: 'CONFIRMED' } },
      orderBy: [{ booking: { reference: 'asc' } }, { sortOrder: 'asc' }],
      include: {
        booking: {
          select: {
            id: true,
            reference: true,
            customer: { select: { fullName: true, phone: true } },
          },
        },
      },
    });
    return {
      trip: {
        id: trip.id,
        code: trip.code,
        tour: trip.tour.name,
        departureDate: trip.departureDate,
      },
      passengers: rows,
    };
  }

  @Patch('trips/:id/passengers/:passengerId/attendance')
  @RequirePermissions('trips.supervise')
  @ApiOperation({ summary: 'Trip supervisor marks a passenger present/absent' })
  async attendance(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('passengerId', ParseUUIDPipe) passengerId: string,
    @Body() dto: AttendanceDto,
  ) {
    const trip = await this.trips.owned(user, id, { supervisors: true });
    this.trips.assertCanSupervise(user, trip);
    const res = await this.prisma.bookingPassenger.updateMany({
      where: { id: passengerId, booking: { tripId: id, status: 'CONFIRMED' } },
      data: { attended: dto.attended },
    });
    if (!res.count)
      throw new NotFoundException('Passenger not found on this trip');
    return { id: passengerId, attended: dto.attended };
  }

  // ---------------- offers

  @Get('trips/:id/offers')
  @RequirePermissions('trips.view')
  async offers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.trips.owned(user, id);
    return this.prisma.tripOffer.findMany({
      where: { tripId: id },
      orderBy: { startsAt: 'desc' },
    });
  }

  @Post('trips/:id/offers')
  @RequirePermissions('offers.manage')
  @ApiOperation({
    summary:
      'Trip-level discount (percentage or fixed per person). Overlapping active offers are refused.',
  })
  createOffer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.trips.createOffer(user, id, dto);
  }

  @Patch('offers/:offerId')
  @RequirePermissions('offers.manage')
  updateOffer(
    @CurrentUser() user: AuthUser,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.trips.updateOffer(user, offerId, dto);
  }

  @Delete('offers/:offerId')
  @RequirePermissions('offers.manage')
  deleteOffer(
    @CurrentUser() user: AuthUser,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    return this.trips.deleteOffer(user, offerId);
  }
}

@Module({
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
