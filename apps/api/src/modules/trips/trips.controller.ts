import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth.types';
import { AgencyId, CurrentUser, RequirePermission } from '../../common/decorators';
import {
  AddTripSupplierDto,
  CreateDestinationDto,
  CreateTripDto,
  ReplaceItineraryDto,
  TripQueryDto,
  UpdateTripDto,
} from './dto/trip.dto';
import { TripsService } from './trips.service';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller()
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get('destinations')
  @RequirePermission('trips.read')
  listDestinations(@AgencyId() agencyId: string) {
    return this.trips.listDestinations(agencyId);
  }

  @Post('destinations')
  @RequirePermission('trips.write')
  createDestination(@CurrentUser() user: AuthUser, @Body() dto: CreateDestinationDto) {
    return this.trips.createDestination(user, dto);
  }

  @Get('trips')
  @RequirePermission('trips.read')
  @ApiOperation({ summary: 'List trips with availability (filter by status, destination, upcoming/past, search)' })
  list(@AgencyId() agencyId: string, @Query() q: TripQueryDto) {
    return this.trips.list(agencyId, q);
  }

  @Get('trips/options')
  @RequirePermission('trips.read')
  @ApiOperation({ summary: 'Compact list of bookable trips for selects' })
  options(@AgencyId() agencyId: string) {
    return this.trips.options(agencyId);
  }

  @Get('trips/:id')
  @RequirePermission('trips.read')
  @ApiOperation({ summary: 'Trip with itinerary, supplier services and booking financials' })
  findOne(@AgencyId() agencyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.trips.findOne(agencyId, id);
  }

  @Post('trips')
  @RequirePermission('trips.write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(user, dto);
  }

  @Patch('trips/:id')
  @RequirePermission('trips.write')
  @ApiOperation({ summary: 'Update a trip. Capacity can never drop below seats already booked.' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(user, id, dto);
  }

  @Delete('trips/:id')
  @RequirePermission('trips.write')
  @ApiOperation({ summary: 'Delete a trip that has no bookings' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trips.remove(user, id);
  }

  @Put('trips/:id/itinerary')
  @RequirePermission('trips.write')
  @ApiOperation({ summary: 'Replace the day-by-day itinerary' })
  replaceItinerary(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceItineraryDto,
  ) {
    return this.trips.replaceItinerary(user, id, dto);
  }

  @Post('trips/:id/suppliers')
  @RequirePermission('trips.write')
  @ApiOperation({ summary: 'Attach a supplier service (hotel nights, coach days...) with its cost' })
  addSupplier(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddTripSupplierDto) {
    return this.trips.addSupplier(user, id, dto);
  }

  @Delete('trips/:id/suppliers/:tripSupplierId')
  @RequirePermission('trips.write')
  removeSupplier(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tripSupplierId', ParseUUIDPipe) tripSupplierId: string,
  ) {
    return this.trips.removeSupplier(user, id, tripSupplierId);
  }
}
