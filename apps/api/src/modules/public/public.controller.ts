import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators';
import { BookingRequestDto } from './public.dto';
import { PublicService } from './public.service';

/** The agency's optional public page. No authentication; only published, public trips are exposed. */
@ApiTags('Public agency page')
@Public()
@Controller('public/agencies/:slug')
export class PublicController {
  constructor(private readonly publicPage: PublicService) {}

  @Get()
  @ApiOperation({ summary: 'Agency profile and its published trips with live availability' })
  agency(@Param('slug') slug: string) {
    return this.publicPage.agency(slug);
  }

  @Get('trips/:tripSlug')
  @ApiOperation({ summary: 'Public trip details with itinerary' })
  trip(@Param('slug') slug: string, @Param('tripSlug') tripSlug: string) {
    return this.publicPage.trip(slug, tripSlug);
  }

  @Post('trips/:tripSlug/booking-requests')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Traveller booking request: holds seats as a PENDING booking the agency confirms later',
  })
  request(@Param('slug') slug: string, @Param('tripSlug') tripSlug: string, @Body() dto: BookingRequestDto) {
    return this.publicPage.requestBooking(slug, tripSlug, dto);
  }
}
