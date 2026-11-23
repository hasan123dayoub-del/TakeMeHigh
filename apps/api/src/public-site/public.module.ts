import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  TRANSPORT_MODES,
  TRAVEL_SCOPES,
  type TransportMode,
  type TravelScope,
} from '@travelos/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import { ClientIp, Public } from '../common/decorators';
import { ilike, PaginationQueryDto } from '../common/dto/pagination.dto';
import { requestNumber } from '../common/utils/codes';
import { D } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LifecycleService } from '../products/lifecycle.service';
import { ProductsModule } from '../products/products.module';
import { bestDiscount, distinctCoreServices } from '../products/rules';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class PublicListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ enum: TRAVEL_SCOPES })
  @IsOptional()
  @IsIn(TRAVEL_SCOPES)
  scope?: TravelScope;
  @ApiPropertyOptional() @IsOptional() @IsUUID() destinationCityId?: string;
  @ApiPropertyOptional({ description: 'Only items with a live discount' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  offersOnly?: boolean;
}

export class RequestItemDto {
  @IsUUID() serviceId!: string;
  /** An existing company, or omit and fill otherText ("Other", CTR-02) */
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) otherText?: string;
  /** Transport: chosen before the company (CTR-03) */
  @IsOptional() @IsIn(TRANSPORT_MODES) transportMode?: TransportMode;
}

export class CustomRequestDto {
  @IsString() @MinLength(3) @MaxLength(120) contactName!: string;
  @IsString()
  @Matches(/^\+?[0-9 ()-]{7,20}$/, {
    message: 'phone must be a valid phone number',
  })
  contactPhone!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(500) passengersCount!: number;
  @IsDateString({ strict: true }) desiredFrom!: string;
  @IsDateString({ strict: true }) desiredTo!: string;
  @IsUUID() originCityId!: string;
  @IsUUID() destinationCityId!: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => RequestItemDto)
  items!: RequestItemDto[];
  /** Honeypot: real visitors never fill it (spam protection, CTR-05) */
  @IsOptional() @IsString() @MaxLength(200) website?: string;
}

const city = {
  select: {
    id: true,
    nameAr: true,
    nameEn: true,
    country: { select: { nameAr: true, isoCode: true } },
  },
} as const;

/**
 * The public landing page API (LND-01..10). Nothing here ever returns costs, profit or a price
 * breakdown (PRC-07): every response is built field by field.
 */
@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
    private readonly audit: AuditService,
  ) {}

  async site() {
    const [settings, branches, policies, slides, achievements, categories] =
      await Promise.all([
        this.prisma.siteSetting.findUnique({ where: { id: 1 } }),
        this.prisma.branch.findMany({
          where: { isActive: true, showOnLanding: true },
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            whatsapp: true,
            latitude: true,
            longitude: true,
            workingHours: true,
            city: { select: { nameAr: true, nameEn: true } },
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.policy.findMany({
          where: { isActive: true },
          select: { slug: true, title: true },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.landingSlide.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            subtitle: true,
            imageUrl: true,
            linkType: true,
            tripId: true,
            programId: true,
            offerId: true,
          },
        }),
        this.prisma.achievement.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { achievedOn: 'desc' }],
          select: {
            id: true,
            title: true,
            description: true,
            achievedOn: true,
            images: {
              orderBy: { sortOrder: 'asc' },
              select: { url: true, caption: true },
            },
          },
        }),
        this.prisma.tripCategory.findMany({
          where: { isActive: true },
          select: { id: true, nameAr: true, nameEn: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);
    if (!settings) throw new NotFoundException('The office is not set up yet');
    return {
      office: {
        name: settings.officeName,
        nameEn: settings.officeNameEn,
        tagline: settings.tagline,
        about: settings.about,
        logoUrl: settings.logoUrl,
        heroImageUrl: settings.heroImageUrl,
        whatsappNumber: settings.whatsappNumber,
        whatsappTemplate: settings.whatsappTemplate,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        socialLinks: settings.socialLinks,
      },
      branches,
      policies,
      slides,
      achievements,
      categories,
    };
  }

  async trips(q: PublicListQueryDto) {
    await this.lifecycle.runDue();
    const now = new Date();
    const where: Prisma.TripWhereInput = {
      isPublic: true,
      status: 'OPEN',
      registrationDeadline: { gt: now },
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.scope ? { scope: q.scope } : {}),
      ...(q.destinationCityId
        ? { destinationCityId: q.destinationCityId }
        : {}),
      ...(q.offersOnly
        ? {
            offerTargets: {
              some: {
                offer: {
                  isActive: true,
                  isPublic: true,
                  validFrom: { lte: now },
                  validTo: { gte: today() },
                },
              },
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { title: ilike(q.search) },
              { destinationCity: { nameAr: ilike(q.search) } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        include: {
          category: { select: { id: true, nameAr: true, nameEn: true } },
          originCity: city,
          destinationCity: city,
          branch: { select: { name: true, whatsapp: true } },
          offerTargets: { include: { offer: true } },
          lines: {
            select: {
              service: { select: { kind: true } },
              transportMode: true,
            },
          },
        },
        orderBy: { startsAt: 'asc' },
        skip: (q.page - 1) * Math.min(q.pageSize, 24),
        take: Math.min(q.pageSize, 24),
      }),
      this.prisma.trip.count({ where }),
    ]);
    return {
      data: rows.map((t) => this.publicTrip(t)),
      meta: {
        page: q.page,
        pageSize: Math.min(q.pageSize, 24),
        total,
        totalPages: Math.max(1, Math.ceil(total / Math.min(q.pageSize, 24))),
      },
    };
  }

  async trip(id: string) {
    const t = await this.prisma.trip.findFirst({
      where: {
        id,
        isPublic: true,
        status: { in: ['OPEN', 'CLOSED', 'CONFIRMED'] },
      },
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true } },
        originCity: city,
        destinationCity: city,
        branch: { select: { name: true, whatsapp: true, phone: true } },
        offerTargets: { include: { offer: true } },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { url: true, caption: true },
        },
        pickupPoints: {
          select: {
            pickupTime: true,
            surcharge: true,
            city: { select: { nameAr: true, nameEn: true } },
          },
        },
        lines: {
          orderBy: { sequenceNo: 'asc' },
          select: {
            startsAt: true,
            endsAt: true,
            transportMode: true,
            service: { select: { kind: true, nameAr: true, nameEn: true } },
            item: {
              select: {
                name: true,
                company: { select: { name: true, rating: true } },
              },
            },
            fromCity: { select: { nameAr: true, nameEn: true } },
            toCity: { select: { nameAr: true, nameEn: true } },
          },
        },
      },
    });
    if (!t) throw new NotFoundException('Trip not found');
    return {
      ...this.publicTrip(t),
      description: t.description,
      terms: t.terms,
      images: t.images,
      pickupPoints: t.pickupPoints,
      itinerary: t.lines,
      branch: t.branch,
    };
  }

  async programs(q: PublicListQueryDto) {
    await this.lifecycle.runDue();
    const now = new Date();
    const where: Prisma.ProgramWhereInput = {
      isPublic: true,
      status: 'OPEN',
      registrationDeadline: { gt: now },
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.scope ? { scope: q.scope } : {}),
      ...(q.destinationCityId
        ? {
            legs: {
              some: { trip: { destinationCityId: q.destinationCityId } },
            },
          }
        : {}),
      ...(q.offersOnly
        ? {
            offerTargets: {
              some: {
                offer: {
                  isActive: true,
                  isPublic: true,
                  validFrom: { lte: now },
                  validTo: { gte: today() },
                },
              },
            },
          }
        : {}),
      ...(q.search ? { OR: [{ title: ilike(q.search) }] } : {}),
    };
    const size = Math.min(q.pageSize, 24);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.program.findMany({
        where,
        include: this.programInclude,
        orderBy: { registrationDeadline: 'asc' },
        skip: (q.page - 1) * size,
        take: size,
      }),
      this.prisma.program.count({ where }),
    ]);
    return {
      data: rows.map((p) => this.publicProgram(p)),
      meta: {
        page: q.page,
        pageSize: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
    };
  }

  async program(id: string) {
    const p = await this.prisma.program.findFirst({
      where: {
        id,
        isPublic: true,
        status: { in: ['OPEN', 'CLOSED', 'CONFIRMED'] },
      },
      include: this.programInclude,
    });
    if (!p) throw new NotFoundException('Program not found');
    return {
      ...this.publicProgram(p),
      description: p.description,
      terms: p.terms,
    };
  }

  async offers() {
    const now = new Date();
    const offers = await this.prisma.offer.findMany({
      where: {
        isActive: true,
        isPublic: true,
        validFrom: { lte: now },
        validTo: { gte: today() },
      },
      include: {
        lines: {
          orderBy: { sequenceNo: 'asc' },
          select: {
            service: { select: { kind: true, nameAr: true } },
            item: {
              select: {
                name: true,
                company: { select: { name: true } },
                toCity: { select: { nameAr: true } },
              },
            },
          },
        },
        targets: {
          include: {
            trip: {
              select: {
                id: true,
                title: true,
                code: true,
                isPublic: true,
                status: true,
                pricePerPerson: true,
                currencyCode: true,
              },
            },
            program: {
              select: {
                id: true,
                title: true,
                code: true,
                isPublic: true,
                status: true,
                pricePerPerson: true,
                currencyCode: true,
              },
            },
          },
        },
      },
      orderBy: { validTo: 'asc' },
    });
    return offers
      .map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        kind: o.kind,
        discountMode: o.discountMode,
        discountValue: o.discountValue,
        validFrom: o.validFrom,
        validTo: o.validTo,
        coverImageUrl: o.coverImageUrl,
        terms: o.terms,
        // BUNDLE: the full price only (no line prices, PRC-07)
        price: o.kind === 'BUNDLE' ? o.pricePerPerson : null,
        currencyCode: o.currencyCode,
        seatsLeft:
          o.maxSeats === null
            ? null
            : Math.max(0, o.maxSeats - o.confirmedSeats),
        services: o.lines.map((l) => ({
          kind: l.service.kind,
          service: l.service.nameAr,
          name: l.item.name,
          company: l.item.company.name,
          city: l.item.toCity?.nameAr,
        })),
        targets: o.targets
          .map((t) => t.trip ?? t.program)
          .filter(
            (x): x is NonNullable<typeof x> =>
              !!x && x.isPublic && x.status === 'OPEN',
          )
          .map((x) => ({
            id: x.id,
            title: x.title,
            code: x.code,
            type: o.targets.find((t) => t.trip?.id === x.id)
              ? 'TRIP'
              : 'PROGRAM',
            price: x.pricePerPerson,
            currencyCode: x.currencyCode,
          })),
      }))
      .filter((o) => o.kind === 'BUNDLE' || o.targets.length);
  }

  async policy(slug: string) {
    const p = await this.prisma.policy.findFirst({
      where: { slug, isActive: true },
      select: { slug: true, title: true, body: true, updatedAt: true },
    });
    if (!p) throw new NotFoundException('Page not found');
    return p;
  }

  /** CTR-02, CTR-03: every select of the "design your trip" form, from the database. */
  async requestOptions() {
    const [services, cities, categories, branches] = await Promise.all([
      this.prisma.service.findMany({
        where: {
          isActive: true,
          kind: { in: ['HOTEL', 'TRANSPORT', 'RESTAURANT'] },
        },
        select: {
          id: true,
          kind: true,
          nameAr: true,
          nameEn: true,
          companies: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              transportMode: true,
              rating: true,
              city: { select: { nameAr: true } },
              country: { select: { nameAr: true } },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.city.findMany({
        where: { isActive: true, country: { isActive: true } },
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          kind: true,
          country: { select: { nameAr: true, isoCode: true } },
        },
        orderBy: [{ country: { nameAr: 'asc' } }, { nameAr: 'asc' }],
      }),
      this.prisma.tripCategory.findMany({
        where: { isActive: true },
        select: { id: true, nameAr: true, nameEn: true },
      }),
      this.prisma.branch.findMany({
        where: { isActive: true, showOnLanding: true },
        select: { id: true, name: true },
      }),
    ]);
    return {
      services,
      cities,
      categories,
      branches,
      transportModes: TRANSPORT_MODES,
      minServices: 2,
    };
  }

  /** CTR-01..05: creates a request (not a booking) and notifies the branch through the dashboard. */
  async submitRequest(dto: CustomRequestDto, ip?: string) {
    if (dto.website) return { ok: true }; // honeypot: silently ignore bots
    const errors: string[] = [];
    if (dto.desiredTo < dto.desiredFrom)
      errors.push('The return date is before the departure date');
    if (dto.desiredFrom < new Date().toISOString().slice(0, 10))
      errors.push('The departure date is in the past');
    if (dto.originCityId === dto.destinationCityId)
      errors.push('Departure and destination must be different');
    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.items.map((i) => i.serviceId) }, isActive: true },
    });
    const companies = await this.prisma.company.findMany({
      where: {
        id: {
          in: dto.items.map((i) => i.companyId).filter((x): x is string => !!x),
        },
        isActive: true,
      },
    });
    for (const [n, item] of dto.items.entries()) {
      const service = services.find((s) => s.id === item.serviceId);
      if (!service) {
        errors.push(`Service #${n + 1} is not available`);
        continue;
      }
      if (!item.companyId && !item.otherText)
        errors.push(
          `Choose a ${service.nameEn.toLowerCase()} or write your suggestion under "Other"`,
        );
      if (item.companyId) {
        const company = companies.find((c) => c.id === item.companyId);
        if (!company || company.serviceId !== service.id)
          errors.push(
            `The chosen ${service.nameEn.toLowerCase()} is not available`,
          );
        else if (
          service.kind === 'TRANSPORT' &&
          item.transportMode &&
          company.transportMode !== item.transportMode
        )
          errors.push(
            'The transport company does not match the chosen transport type',
          );
      }
      if (service.kind === 'TRANSPORT' && !item.transportMode)
        errors.push('Choose land, sea or air transport first');
    }
    if (
      distinctCoreServices(
        services
          .filter((s) => dto.items.some((i) => i.serviceId === s.id))
          .map((s) => s.kind),
      ) < 2
    )
      errors.push(
        'Choose at least two different services: hotel, transport or restaurant (BR-04)',
      );
    const cities = await this.prisma.city.count({
      where: {
        id: { in: [dto.originCityId, dto.destinationCityId] },
        isActive: true,
      },
    });
    if (cities !== 2)
      errors.push('Choose the departure and destination from the list');
    if (
      dto.branchId &&
      !(await this.prisma.branch.findFirst({
        where: { id: dto.branchId, isActive: true },
      }))
    )
      errors.push('The chosen branch is not available');
    if (errors.length) throw new BadRequestException(errors);

    const request = await this.prisma.$transaction(async (tx) => {
      const r = await tx.customTripRequest.create({
        data: {
          requestNo: await requestNumber(tx),
          contactName: dto.contactName.trim(),
          contactPhone: dto.contactPhone.replace(/[\s()-]/g, ''),
          passengersCount: dto.passengersCount,
          desiredFrom: new Date(dto.desiredFrom),
          desiredTo: new Date(dto.desiredTo),
          originCityId: dto.originCityId,
          destinationCityId: dto.destinationCityId,
          categoryId: dto.categoryId,
          assignedBranchId: dto.branchId,
          message: dto.message,
          items: {
            create: dto.items.map((i) => ({
              serviceId: i.serviceId,
              companyId: i.companyId ?? null,
              otherText: i.companyId ? null : i.otherText,
              transportMode: i.transportMode ?? null,
            })),
          },
        },
      });
      await this.audit.log(
        null,
        {
          action: 'request.submitted',
          entityType: 'request',
          entityId: r.id,
          summary: `Custom trip request ${r.requestNo} from ${r.contactName}`,
          ip,
        },
        tx,
      );
      return r;
    });
    return { ok: true, requestNo: request.requestNo };
  }

  // ------------------------------------------------------------------ shaping

  private programInclude = {
    category: { select: { id: true, nameAr: true, nameEn: true } },
    offerTargets: { include: { offer: true } },
    legs: {
      orderBy: { sequenceNo: 'asc' as const },
      select: {
        sequenceNo: true,
        trip: {
          select: {
            id: true,
            code: true,
            title: true,
            startsAt: true,
            endsAt: true,
            maxPassengers: true,
            confirmedSeats: true,
            originCity: city,
            destinationCity: city,
            lines: {
              select: {
                service: { select: { kind: true } },
                transportMode: true,
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.ProgramInclude;

  private priceWithDiscount(
    price: Prisma.Decimal,
    targets: {
      offer: Parameters<typeof bestDiscount>[1][number] & { isPublic: boolean };
    }[],
  ) {
    const best = bestDiscount(
      price,
      targets.map((t) => t.offer).filter((o) => o.isPublic),
    );
    return {
      price: D(price).toFixed(2),
      finalPrice: best
        ? D(price).sub(best.amount).toFixed(2)
        : D(price).toFixed(2),
      offer: best
        ? {
            id: best.offer.id,
            title: best.offer.title,
            discountMode: best.offer.discountMode,
            discountValue: best.offer.discountValue.toString(),
            validTo: best.offer.validTo,
          }
        : null,
    };
  }

  private publicTrip(t: {
    id: string;
    code: string;
    title: string;
    scope: string;
    startsAt: Date;
    endsAt: Date;
    registrationDeadline: Date;
    currencyCode: string;
    pricePerPerson: Prisma.Decimal;
    maxPassengers: number;
    confirmedSeats: number;
    coverImageUrl: string | null;
    category: { id: string; nameAr: string; nameEn: string };
    originCity: unknown;
    destinationCity: unknown;
    offerTargets: {
      offer: Parameters<typeof bestDiscount>[1][number] & { isPublic: boolean };
    }[];
    lines: { service: { kind: string }; transportMode: string | null }[];
  }) {
    return {
      id: t.id,
      type: 'TRIP' as const,
      code: t.code,
      title: t.title,
      scope: t.scope,
      category: t.category,
      originCity: t.originCity,
      destinationCity: t.destinationCity,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      registrationDeadline: t.registrationDeadline,
      coverImageUrl: t.coverImageUrl,
      currencyCode: t.currencyCode,
      seatsLeft: Math.max(0, t.maxPassengers - t.confirmedSeats),
      services: [...new Set(t.lines.map((l) => l.service.kind))],
      transportModes: [
        ...new Set(t.lines.map((l) => l.transportMode).filter(Boolean)),
      ],
      ...this.priceWithDiscount(t.pricePerPerson, t.offerTargets),
    };
  }

  private publicProgram(
    p: Prisma.ProgramGetPayload<{ include: PublicService['programInclude'] }>,
  ) {
    const legs = p.legs.map((l) => l.trip);
    return {
      id: p.id,
      type: 'PROGRAM' as const,
      code: p.code,
      title: p.title,
      scope: p.scope,
      category: p.category,
      coverImageUrl: p.coverImageUrl,
      registrationDeadline: p.registrationDeadline,
      startsAt: legs[0]?.startsAt ?? null,
      endsAt: legs.at(-1)?.endsAt ?? null,
      currencyCode: p.currencyCode,
      seatsLeft: Math.max(
        0,
        Math.min(
          p.maxPassengers - p.confirmedSeats,
          ...legs.map((l) => l.maxPassengers - l.confirmedSeats),
        ),
      ),
      services: [
        ...new Set(legs.flatMap((l) => l.lines.map((x) => x.service.kind))),
      ],
      transportModes: [
        ...new Set(
          legs
            .flatMap((l) => l.lines.map((x) => x.transportMode))
            .filter(Boolean),
        ),
      ],
      legs: legs.map((l) => ({
        code: l.code,
        title: l.title,
        startsAt: l.startsAt,
        endsAt: l.endsAt,
        originCity: l.originCity,
        destinationCity: l.destinationCity,
      })),
      ...this.priceWithDiscount(p.pricePerPerson, p.offerTargets),
    };
  }
}

const today = () =>
  new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

@ApiTags('Public landing page')
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly site: PublicService) {}

  @Get('site')
  @ApiOperation({
    summary:
      'Office identity, branches, slides, achievements, policies and categories (LND-02)',
  })
  get() {
    return this.site.site();
  }

  @Get('trips')
  @ApiOperation({
    summary: 'Public open trips with the full price only (LND-03, LND-04)',
  })
  trips(@Query() q: PublicListQueryDto) {
    return this.site.trips(q);
  }

  @Get('trips/:id')
  trip(@Param('id', ParseUUIDPipe) id: string) {
    return this.site.trip(id);
  }

  @Get('programs')
  programs(@Query() q: PublicListQueryDto) {
    return this.site.programs(q);
  }

  @Get('programs/:id')
  program(@Param('id', ParseUUIDPipe) id: string) {
    return this.site.program(id);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Live offers and discounts (LND-02 §2)' })
  offers() {
    return this.site.offers();
  }

  @Get('policies/:slug')
  policy(@Param('slug') slug: string) {
    return this.site.policy(slug);
  }

  @Get('request-options')
  @ApiOperation({ summary: 'Options of the "design your trip" form (CTR-02)' })
  requestOptions() {
    return this.site.requestOptions();
  }

  @Post('requests')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({
    summary: 'Submit a custom trip request (CTR-05; 5 per hour per visitor)',
  })
  submit(@Body() dto: CustomRequestDto, @ClientIp() ip?: string) {
    return this.site.submitRequest(dto, ip);
  }
}

@Module({
  imports: [ProductsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicSiteModule {}
