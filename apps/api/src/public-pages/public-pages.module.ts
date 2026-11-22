import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import { TRIP_TYPES } from '@travelos/shared';
import type { TripType } from '@travelos/shared';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { paginate } from '../common/dto/pagination.dto';
import { officeUser } from '../common/scope';
import { D, toMoney } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  activeOffer,
  discountFor,
  isoDate,
  todayIso,
  toDate,
} from '../trips/pricing';

// ------------------------------------------------------------------ DTOs

export class ShowcaseQueryDto {
  @IsOptional() @IsString() @MaxLength(80) destination?: string;
  /** Category name (categories are defined per office) */
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsIn(TRIP_TYPES) tripType?: TripType;
  @IsOptional() @IsDateString({ strict: true }) from?: string;
  @IsOptional() @IsDateString({ strict: true }) to?: string;
  @IsOptional() @IsIn(['true', 'false']) offersOnly?: 'true' | 'false';
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(48) pageSize = 12;
}

export class BannerDto {
  @IsString() @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(200) subtitle?: string;
  @IsOptional() @IsUrl({ require_tld: false }) imageUrl?: string;
  @IsOptional() @IsUUID() tripId?: string;
  @IsDateString({ strict: true }) startsAt!: string;
  @IsDateString({ strict: true }) endsAt!: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateBannerDto extends PartialType(BannerDto) {}

// ------------------------------------------------------------------ service

const publicTripInclude = {
  tour: {
    include: { category: true, images: { orderBy: { sortOrder: 'asc' } } },
  },
  office: true,
  branch: {
    select: {
      name: true,
      city: true,
      latitude: true,
      longitude: true,
      address: true,
    },
  },
  offers: true,
  services: { select: { serviceType: true, description: true } },
} satisfies Prisma.TripInclude;
type PublicTrip = Prisma.TripGetPayload<{ include: typeof publicTripInclude }>;

/** Digits only, for wa.me links. */
const waDigits = (n: string | null) => (n ? n.replace(/\D/g, '') : null);

@Injectable()
export class PublicPagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Only published trips of active offices that enabled their public page, still open for registration. */
  private publicWhere(
    extra: Prisma.TripWhereInput = {},
  ): Prisma.TripWhereInput {
    return {
      isPublic: true,
      status: 'OPEN',
      departureDate: { gte: toDate(todayIso()) },
      office: { isActive: true, publicPageEnabled: true },
      ...extra,
    };
  }

  /** The card a visitor sees. Never exposes costs, profit, supplier names or internal ids beyond the trip id. */
  private card(t: PublicTrip) {
    const offer = activeOffer(t.offers);
    const price = D(t.sellingPricePerPerson);
    const discount = discountFor(offer, price, 1);
    return {
      id: t.id,
      code: t.code,
      title: t.tour.name,
      destination: t.tour.destination,
      category: t.tour.category
        ? { name: t.tour.category.name, nameAr: t.tour.category.nameAr }
        : null,
      tripType: t.tripType,
      days: t.tour.days,
      nights: t.tour.nights,
      departureDate: isoDate(t.departureDate),
      returnDate: isoDate(t.returnDate),
      registrationClosesOn: isoDate(
        t.registrationExtendedUntil ?? t.registrationDeadline,
      ),
      coverImageUrl: t.tour.coverImageUrl ?? t.tour.images[0]?.url ?? null,
      currencyCode: t.currencyCode,
      price: toMoney(price),
      priceAfterOffer: toMoney(price.sub(discount)),
      offer: offer
        ? {
            title: offer.title,
            description: offer.description,
            discountType: offer.discountType,
            discountValue: toMoney(offer.discountValue),
            endsAt: isoDate(offer.endsAt),
          }
        : null,
      seatsAvailable: Math.max(0, t.maxSeats - t.confirmedSeats),
      includes: t.services.map((s) => s.serviceType),
      office: {
        name: t.office.name,
        slug: t.office.slug,
        city: t.office.city,
        logoUrl: t.office.logoUrl,
        brandColor: t.office.brandColor,
        whatsapp: waDigits(t.office.whatsappNumber),
      },
      whatsappUrl: this.whatsappUrl(t),
    };
  }

  /** "Book now" = WhatsApp to the office with a prefilled message (no checkout, no booking record). */
  private whatsappUrl(t: PublicTrip) {
    const digits = waDigits(t.office.whatsappNumber);
    if (!digits) return null;
    const text =
      `مرحباً ${t.office.name}، أرغب بالحجز في رحلة:\n` +
      `${t.tour.name} (${t.tripType === 'VIP' ? 'VIP' : 'عادي'})\n` +
      `رمز الرحلة: ${t.code}\n` +
      `تاريخ الانطلاق: ${isoDate(t.departureDate)}\n` +
      `عدد الأشخاص: `;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  async showcase(q: ShowcaseQueryDto) {
    const where = this.publicWhere({
      ...(q.tripType ? { tripType: q.tripType } : {}),
      ...(q.from || q.to
        ? {
            departureDate: {
              gte: toDate(q.from ?? todayIso()),
              ...(q.to ? { lte: toDate(q.to) } : {}),
            },
          }
        : {}),
      tour: {
        ...(q.destination
          ? { destination: { contains: q.destination, mode: 'insensitive' } }
          : {}),
        ...(q.category
          ? {
              category: {
                OR: [
                  { name: { equals: q.category, mode: 'insensitive' } },
                  { nameAr: q.category },
                ],
              },
            }
          : {}),
        ...(q.search
          ? {
              OR: [
                { name: { contains: q.search, mode: 'insensitive' } },
                { destination: { contains: q.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });
    const all = await this.prisma.trip.findMany({
      where,
      include: publicTripInclude,
      orderBy: { departureDate: 'asc' },
      take: 500,
    });
    const cards = all
      .map((t) => this.card(t))
      .filter((c) => (q.offersOnly === 'true' ? !!c.offer : true));
    const page = cards.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    return {
      ...paginate(page, cards.length, q.page, q.pageSize),
      banners: await this.banners(),
      facets: await this.facets(),
    };
  }

  /** Active ads for the moving banner strip: offices with a public page, current dates, linked trip still public. */
  async banners(officeId?: string) {
    const today = toDate(todayIso());
    const rows = await this.prisma.promoBanner.findMany({
      where: {
        isActive: true,
        startsAt: { lte: today },
        endsAt: { gte: today },
        office: {
          isActive: true,
          publicPageEnabled: true,
          ...(officeId ? { id: officeId } : {}),
        },
        OR: [{ tripId: null }, { trip: this.publicWhere() }],
      },
      include: {
        office: {
          select: { name: true, slug: true, logoUrl: true, brandColor: true },
        },
        trip: { include: { offers: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    });
    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.imageUrl,
      office: b.office,
      tripId: b.tripId,
      link: b.tripId
        ? `/${b.office.slug}/trips/${b.tripId}`
        : `/${b.office.slug}`,
    }));
  }

  private async facets() {
    const trips = await this.prisma.trip.findMany({
      where: this.publicWhere(),
      select: {
        tour: {
          select: {
            destination: true,
            category: { select: { name: true, nameAr: true } },
          },
        },
      },
    });
    const destinations = [
      ...new Set(trips.map((t) => t.tour.destination)),
    ].sort();
    const categories = [
      ...new Map(
        trips
          .filter((t) => t.tour.category)
          .map((t) => [t.tour.category!.name, t.tour.category!]),
      ).values(),
    ];
    return { destinations, categories, tripTypes: TRIP_TYPES };
  }

  async office(slug: string) {
    const office = await this.prisma.office.findFirst({
      where: { slug, isActive: true, publicPageEnabled: true },
      include: {
        branches: {
          where: { isActive: true },
          orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
        },
      },
    });
    // A disabled page looks exactly like a missing one.
    if (!office) throw new NotFoundException('Office page not found');
    const trips = await this.prisma.trip.findMany({
      where: this.publicWhere({ officeId: office.id }),
      include: publicTripInclude,
      orderBy: { departureDate: 'asc' },
    });
    return {
      office: {
        name: office.name,
        slug: office.slug,
        description: office.description,
        city: office.city,
        address: office.address,
        phone: office.phone,
        email: office.email,
        whatsapp: waDigits(office.whatsappNumber),
        whatsappUrl: office.whatsappNumber
          ? `https://wa.me/${waDigits(office.whatsappNumber)}`
          : null,
        logoUrl: office.logoUrl,
        coverImageUrl: office.coverImageUrl,
        brandColor: office.brandColor,
        location:
          office.latitude && office.longitude
            ? {
                latitude: Number(office.latitude),
                longitude: Number(office.longitude),
              }
            : null,
        branches: office.branches.map((b) => ({
          name: b.name,
          city: b.city,
          address: b.address,
          phone: b.phone,
          location:
            b.latitude && b.longitude
              ? { latitude: Number(b.latitude), longitude: Number(b.longitude) }
              : null,
        })),
        bookingTerms: office.bookingTerms,
        cancellationTerms: office.cancellationTerms,
      },
      trips: trips.map((t) => this.card(t)),
      banners: await this.banners(office.id),
    };
  }

  async trip(slug: string, tripId: string) {
    const t = await this.prisma.trip.findFirst({
      where: this.publicWhere({
        id: tripId,
        office: { slug, isActive: true, publicPageEnabled: true },
      }),
      include: {
        ...publicTripInclude,
        tour: {
          include: {
            category: true,
            images: { orderBy: { sortOrder: 'asc' } },
            itinerary: { orderBy: { dayNumber: 'asc' } },
          },
        },
      },
    });
    if (!t) throw new NotFoundException('Trip not found');
    return {
      ...this.card(t),
      description: t.tour.description,
      accommodationInfo: t.tour.accommodationInfo,
      transportationInfo: t.tour.transportationInfo,
      bookingTerms: t.tour.bookingTerms ?? t.office.bookingTerms,
      cancellationTerms: t.tour.cancellationTerms ?? t.office.cancellationTerms,
      images: t.tour.images.map((i) => ({ url: i.url, caption: i.caption })),
      itinerary: t.tour.itinerary.map((d) => ({
        dayNumber: d.dayNumber,
        title: d.title,
        description: d.description,
        location: d.location,
      })),
      services: t.services.map((s) => ({
        type: s.serviceType,
        description: s.description,
      })),
      branch: {
        name: t.branch.name,
        city: t.branch.city,
        address: t.branch.address,
        location:
          t.branch.latitude && t.branch.longitude
            ? {
                latitude: Number(t.branch.latitude),
                longitude: Number(t.branch.longitude),
              }
            : null,
      },
    };
  }

  // ------------------------------------------------------------------ banner management (office side)

  listBanners(user: AuthUser) {
    return this.prisma.promoBanner.findMany({
      where: { officeId: officeUser(user).officeId },
      include: { trip: { select: { code: true } } },
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async createBanner(user: AuthUser, dto: BannerDto) {
    const { officeId } = officeUser(user);
    await this.assertBannerTrip(officeId, dto.tripId);
    return this.prisma.promoBanner.create({
      data: {
        ...dto,
        officeId,
        startsAt: toDate(dto.startsAt),
        endsAt: toDate(dto.endsAt),
      },
    });
  }

  async updateBanner(user: AuthUser, id: string, dto: UpdateBannerDto) {
    const { officeId } = officeUser(user);
    if (!(await this.prisma.promoBanner.findFirst({ where: { id, officeId } })))
      throw new NotFoundException('Banner not found');
    await this.assertBannerTrip(officeId, dto.tripId);
    return this.prisma.promoBanner.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? toDate(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? toDate(dto.endsAt) : undefined,
      },
    });
  }

  async deleteBanner(user: AuthUser, id: string) {
    const res = await this.prisma.promoBanner.deleteMany({
      where: { id, officeId: officeUser(user).officeId },
    });
    if (!res.count) throw new NotFoundException('Banner not found');
    return { deleted: true };
  }

  private async assertBannerTrip(officeId: string, tripId?: string) {
    if (
      tripId &&
      !(await this.prisma.trip.findFirst({ where: { id: tripId, officeId } }))
    )
      throw new NotFoundException('Trip not found');
  }
}

// ------------------------------------------------------------------ controllers

@ApiTags('Public pages (no login)')
@Public()
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('public')
export class PublicPagesController {
  constructor(private readonly pages: PublicPagesService) {}

  @Get('showcase')
  @ApiOperation({
    summary:
      'Safarni landing: published trips of participating offices, filters, moving ads. Not a marketplace: booking goes to the office via WhatsApp.',
  })
  showcase(@Query() q: ShowcaseQueryDto) {
    return this.pages.showcase(q);
  }

  @Get('offices/:slug')
  @ApiOperation({
    summary:
      "An office's own public page: profile, location/branches, trips, ads",
  })
  office(@Param('slug') slug: string) {
    return this.pages.office(slug);
  }

  @Get('offices/:slug/trips/:tripId')
  @ApiOperation({
    summary:
      'Public trip details with itinerary and a prefilled WhatsApp "Book now" link',
  })
  trip(
    @Param('slug') slug: string,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.pages.trip(slug, tripId);
  }
}

@ApiTags('Ads (banners)')
@ApiBearerAuth()
@Controller('banners')
export class BannersController {
  constructor(private readonly pages: PublicPagesService) {}

  @Get()
  @RequirePermissions('offers.manage')
  list(@CurrentUser() user: AuthUser) {
    return this.pages.listBanners(user);
  }

  @Post()
  @RequirePermissions('offers.manage')
  @ApiOperation({
    summary:
      'Ad shown in the moving strip on the landing page and the office page',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: BannerDto) {
    return this.pages.createBanner(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('offers.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.pages.updateBanner(user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('offers.manage')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pages.deleteBanner(user, id);
  }
}

@Module({
  controllers: [PublicPagesController, BannersController],
  providers: [PublicPagesService],
})
export class PublicPagesModule {}
