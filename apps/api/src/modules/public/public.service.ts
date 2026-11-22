import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual } from 'typeorm';
import { AgencySettings } from '../agencies/entities/agency-settings.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { BookingsService } from '../bookings/bookings.service';
import { TripItinerary } from '../trips/entities/trip-itinerary.entity';
import { Trip } from '../trips/entities/trip.entity';
import { BookingRequestDto } from './public.dto';

@Injectable()
export class PublicService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly bookings: BookingsService,
  ) {}

  private async loadAgency(slug: string) {
    const agency = await this.db.getRepository(Agency).findOne({ where: { slug, isActive: true } });
    const settings = agency && (await this.db.getRepository(AgencySettings).findOneBy({ agencyId: agency.id }));
    // A disabled page looks exactly like a missing one.
    if (!agency || !settings?.publicPageEnabled) throw new NotFoundException('Agency page not found');
    return { agency, settings };
  }

  private publicTrips(agencyId: string) {
    return this.db.getRepository(Trip).find({
      where: {
        agencyId,
        isPublic: true,
        status: In(['PUBLISHED', 'FULL']),
        departureDate: MoreThanOrEqual(new Date().toISOString().slice(0, 10)),
      },
      relations: { destination: true },
      order: { departureDate: 'ASC' },
    });
  }

  /** Only fields safe for the public: no costs, no internal notes, no ids of other records. */
  private card(t: Trip) {
    return {
      slug: t.slug,
      code: t.code,
      title: t.title,
      summary: t.summary,
      destination: t.destination ? { name: t.destination.name, country: t.destination.country } : null,
      departureDate: t.departureDate,
      returnDate: t.returnDate,
      departureLocation: t.departureLocation,
      pricePerPerson: t.pricePerPerson,
      childPrice: t.childPrice,
      coverImageUrl: t.coverImageUrl,
      seatsAvailable: Math.max(0, t.capacity - t.seatsBooked),
      soldOut: t.status === 'FULL' || t.seatsBooked >= t.capacity,
    };
  }

  async agency(slug: string) {
    const { agency, settings } = await this.loadAgency(slug);
    const trips = await this.publicTrips(agency.id);
    return {
      agency: {
        name: agency.name,
        slug: agency.slug,
        city: agency.city,
        country: agency.country,
        phone: agency.phone,
        email: agency.email,
        currency: agency.currency,
        logoUrl: agency.logoUrl,
        tagline: settings.publicTagline,
        description: settings.publicDescription,
        heroImageUrl: settings.heroImageUrl,
        brandColor: settings.brandColor,
        whatsappNumber: settings.whatsappNumber,
        bookingTerms: settings.bookingTerms,
        depositPercent: settings.depositPercent,
      },
      trips: trips.map((t) => this.card(t)),
    };
  }

  async trip(slug: string, tripSlug: string) {
    const { agency } = await this.loadAgency(slug);
    const trip = (await this.publicTrips(agency.id)).find((t) => t.slug === tripSlug);
    if (!trip) throw new NotFoundException('Trip not found');
    const itinerary = await this.db.getRepository(TripItinerary).find({
      where: { tripId: trip.id, agencyId: agency.id },
      order: { dayNumber: 'ASC' },
      select: { dayNumber: true, title: true, description: true, location: true },
    });
    return {
      ...this.card(trip),
      description: trip.description,
      inclusions: trip.inclusions ?? [],
      exclusions: trip.exclusions ?? [],
      itinerary,
      agency: { name: agency.name, slug: agency.slug, currency: agency.currency },
    };
  }

  async requestBooking(slug: string, tripSlug: string, dto: BookingRequestDto) {
    const { agency } = await this.loadAgency(slug);
    const trip = (await this.publicTrips(agency.id)).find((t) => t.slug === tripSlug);
    if (!trip) throw new NotFoundException('Trip not found');

    const booking = await this.bookings.create(
      { agencyId: agency.id, userId: null },
      {
        tripId: trip.id,
        customer: { firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, email: dto.email },
        adults: dto.adults,
        children: dto.children ?? 0,
        specialRequests: dto.message,
        notes: 'Submitted from the public booking page.',
      },
      'PUBLIC_PAGE',
    );

    // The traveller only gets what they need: no internal ids beyond the reference.
    return {
      reference: booking.reference,
      status: booking.status,
      trip: trip.title,
      departureDate: trip.departureDate,
      seats: booking.seats,
      totalAmount: booking.totalAmount,
      currency: agency.currency,
      message: `Thank you ${dto.firstName}. Your seats are held and ${agency.name} will contact you to confirm.`,
    };
  }
}
