import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService, diff } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import {
  ilike,
  orderArgs,
  pageArgs,
  paginate,
} from '../common/dto/pagination.dto';
import {
  assertCanEditProduct,
  isAll,
  productBranchFor,
  productVisibility,
} from '../common/scope';
import { tripCode } from '../common/utils/codes';
import { D, sellingPrice, toMoney } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';
import { SuppliersService } from '../suppliers/suppliers.module';
import type {
  AttendanceDto,
  CreateTripDto,
  DecisionDto,
  ImageDto,
  LineDto,
  PickupPointDto,
  TripQueryDto,
  UpdateLineDto,
  UpdateTripDto,
} from './products.dto';
import { LifecycleService } from './lifecycle.service';
import {
  defaultQuantity,
  lineCost,
  orderLines,
  publishErrors,
  routeErrors,
  travelScope,
  tripTotals,
  type RouteLine,
} from './rules';

export const tripListInclude = {
  category: { select: { id: true, nameAr: true, nameEn: true } },
  branch: { select: { id: true, name: true } },
  originCity: { select: { id: true, nameAr: true, nameEn: true } },
  destinationCity: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      country: { select: { nameAr: true, isoCode: true } },
    },
  },
  _count: { select: { lines: true, guides: true, programLegs: true } },
} satisfies Prisma.TripInclude;

export const lineInclude = {
  item: {
    select: {
      id: true,
      name: true,
      costPerPerson: true,
      currencyCode: true,
      isActive: true,
      isStale: true,
      available: true,
      company: {
        select: { id: true, name: true, transportMode: true, isActive: true },
      },
    },
  },
  service: {
    select: { id: true, code: true, kind: true, nameAr: true, nameEn: true },
  },
  fromCity: { select: { id: true, nameAr: true, nameEn: true } },
  toCity: { select: { id: true, nameAr: true, nameEn: true } },
} satisfies Prisma.TripServiceLineInclude;

const detailInclude = {
  ...tripListInclude,
  currency: true,
  lines: { include: lineInclude, orderBy: { sequenceNo: 'asc' } },
  pickupPoints: {
    include: { city: { select: { id: true, nameAr: true, nameEn: true } } },
    orderBy: { surcharge: 'asc' },
  },
  guides: {
    include: {
      user: {
        select: { id: true, fullName: true, phone: true, guideProfile: true },
      },
    },
  },
  images: { orderBy: { sortOrder: 'asc' } },
  programLegs: {
    include: {
      program: { select: { id: true, code: true, title: true, status: true } },
    },
  },
  decisions: {
    include: { decidedBy: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  },
  offerTargets: {
    include: {
      offer: {
        select: {
          id: true,
          title: true,
          discountMode: true,
          discountValue: true,
          validFrom: true,
          validTo: true,
          isActive: true,
        },
      },
    },
  },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.TripInclude;

type TripDetail = Prisma.TripGetPayload<{ include: typeof detailInclude }>;

/** States in which the trip structure (dates, services) may still be edited freely. */
const EDITABLE = ['DRAFT', 'OPEN'];

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly suppliers: SuppliersService,
    private readonly lifecycle: LifecycleService,
  ) {}

  // ------------------------------------------------------------------ read

  async list(user: AuthUser, q: TripQueryDto) {
    await this.lifecycle.runDue();
    const where: Prisma.TripWhereInput = {
      AND: [
        productVisibility(user, q.branchId),
        q.status ? { status: q.status } : {},
        q.categoryId ? { categoryId: q.categoryId } : {},
        q.scope ? { scope: q.scope } : {},
        q.isPublic !== undefined ? { isPublic: q.isPublic } : {},
        q.costChanged ? { costChangedAt: { not: null } } : {},
        q.bookable
          ? { status: 'OPEN', registrationDeadline: { gt: new Date() } }
          : {},
        q.from || q.to
          ? {
              startsAt: {
                ...(q.from ? { gte: q.from } : {}),
                ...(q.to ? { lte: q.to } : {}),
              },
            }
          : {},
        q.search
          ? {
              OR: [
                { title: ilike(q.search) },
                { code: ilike(q.search) },
                { originCity: { nameAr: ilike(q.search) } },
                { destinationCity: { nameAr: ilike(q.search) } },
              ],
            }
          : {},
      ],
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        include: tripListInclude,
        orderBy: orderArgs(
          q,
          [
            'startsAt',
            'createdAt',
            'title',
            'pricePerPerson',
            'registrationDeadline',
          ] as const,
          'startsAt',
        ),
        ...pageArgs(q),
      }),
      this.prisma.trip.count({ where }),
    ]);
    return paginate(
      rows.map((t) =>
        this.mask(user, {
          ...t,
          availableSeats: t.maxPassengers - t.confirmedSeats,
        }),
      ),
      total,
      q,
    );
  }

  async get(user: AuthUser, id: string) {
    await this.lifecycle.runDue();
    const trip = await this.prisma.trip.findFirst({
      where: { AND: [{ id }, productVisibility(user)] },
      include: detailInclude,
    });
    if (!trip) throw new NotFoundException('Trip not found');
    const counts = await this.prisma.$queryRaw<{ status: string; n: bigint }[]>`
      SELECT status::text, COUNT(*)::bigint AS n FROM v_trip_passengers WHERE trip_id = ${id}::uuid GROUP BY status`;
    const passengers = Object.fromEntries(
      counts.map((c) => [c.status, Number(c.n)]),
    );
    return this.mask(user, {
      ...trip,
      availableSeats: trip.maxPassengers - trip.confirmedSeats,
      passengers: {
        confirmed: passengers.CONFIRMED ?? 0,
        pending: passengers.PENDING ?? 0,
        waitlist: passengers.WAITLIST ?? 0,
      },
      warnings: this.warnings(trip),
    });
  }

  /** Trip as seen by someone without pricing.view_breakdown: totals only (PRC-06). */
  mask<T extends Record<string, unknown>>(user: AuthUser, trip: T): T {
    if (user.permissions.includes('pricing.view_breakdown')) return trip;
    const t = { ...trip, costPerPerson: undefined } as Record<string, unknown>;
    if (Array.isArray(t.lines))
      t.lines = (t.lines as Record<string, unknown>[]).map((l) => ({
        ...l,
        costSnapshot: undefined,
        unitCost: undefined,
        profitMode: undefined,
        profitValue: undefined,
        sellingPrice: undefined,
        item: l.item ? { ...l.item, costPerPerson: undefined } : undefined,
      }));
    return t as T;
  }

  private warnings(trip: TripDetail) {
    const w: string[] = [];
    if (trip.costChangedAt) w.push('COST_CHANGED');
    if (trip.lines.some((l) => !l.item.isActive || !l.item.company.isActive))
      w.push('INACTIVE_SUPPLIER');
    if (trip.lines.some((l) => l.item.isStale)) w.push('STALE_COST');
    if (trip.lines.some((l) => l.item.available === false))
      w.push('UNAVAILABLE_SERVICE');
    if (
      trip.status === 'CLOSED' &&
      (trip.finalPassengerCount ?? 0) < trip.minPassengers
    )
      w.push('BELOW_MINIMUM');
    return w;
  }

  // ------------------------------------------------------------------ create / update

  async create(user: AuthUser, dto: CreateTripDto) {
    const branchId = productBranchFor(user, dto.branchId);
    const scope = await this.validateFrame(dto);
    await this.assertRefs(dto.categoryId, branchId, dto.currencyCode);
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          ...dto,
          branchId,
          scope,
          code: await tripCode(tx),
          createdById: user.userId,
          isPublic: dto.isPublic ?? false,
        },
      });
      await this.audit.log(
        user,
        {
          action: 'trip.created',
          entityType: 'trip',
          entityId: trip.id,
          summary: `Trip ${trip.code} "${trip.title}" created`,
          changes: { after: dto },
        },
        tx,
      );
      return trip;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateTripDto) {
    const trip = await this.loadForEdit(user, id);
    const structural = [
      'startsAt',
      'endsAt',
      'originCityId',
      'destinationCityId',
    ].some((k) => k in dto && dto[k as keyof UpdateTripDto] !== undefined);
    if (structural) await this.assertStructureEditable(user, trip);
    if (dto.branchId !== undefined && !isAll(user))
      throw new ForbiddenException(
        'Only the Admin can move a trip to another branch',
      );
    const merged = { ...trip, ...dto };
    const scope = await this.validateFrame(merged);
    if (
      dto.maxPassengers !== undefined &&
      dto.maxPassengers < trip.confirmedSeats
    )
      throw new ConflictException(
        `${trip.confirmedSeats} seats are already confirmed; capacity cannot go below that`,
      );
    if (dto.categoryId || dto.branchId)
      await this.assertRefs(
        dto.categoryId ?? trip.categoryId,
        dto.branchId ?? trip.branchId,
        trip.currencyCode,
      );
    if (structural) {
      const lines = await this.prisma.tripServiceLine.findMany({
        where: { tripId: id },
        include: lineInclude,
      });
      const errors = routeErrors(
        merged,
        lines.map((l) => this.routeLine(l)),
      );
      if (errors.length) throw new BadRequestException(errors);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id },
        data: { ...dto, scope },
      });
      await this.audit.log(
        user,
        {
          action: 'trip.updated',
          entityType: 'trip',
          entityId: id,
          summary: `Trip ${trip.code} updated`,
          changes: diff(trip as never, dto as never),
        },
        tx,
      );
      return updated;
    });
  }

  async setImages(user: AuthUser, id: string, images: ImageDto[]) {
    await this.loadForEdit(user, id);
    await this.prisma.$transaction([
      this.prisma.tripImage.deleteMany({ where: { tripId: id } }),
      this.prisma.tripImage.createMany({
        data: images.map((img, i) => ({
          tripId: id,
          url: img.url,
          caption: img.caption,
          sortOrder: i,
        })),
      }),
    ]);
    return this.prisma.tripImage.findMany({
      where: { tripId: id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ------------------------------------------------------------------ service lines (TRP-04..07)

  async addLine(user: AuthUser, tripId: string, dto: LineDto) {
    const trip = await this.loadForEdit(user, tripId);
    await this.assertStructureEditable(user, trip);
    const item = await this.prisma.companyItem.findFirst({
      where: {
        id: dto.companyItemId,
        isActive: true,
        company: { isActive: true },
      },
      include: { company: { include: { service: true } } },
    });
    if (!item)
      throw new NotFoundException('Service item not found or deactivated');
    if (item.currencyCode !== trip.currencyCode)
      throw new BadRequestException(
        `This item is priced in ${item.currencyCode}; the trip uses ${trip.currencyCode} (TBD-06: one currency per trip)`,
      );

    const profit = await this.profitFor(
      user,
      item.company.serviceId,
      item.companyId,
      dto,
    );
    const transport = item.company.service.kind === 'TRANSPORT';
    const toCityId = transport
      ? item.toCityId
      : (dto.toCityId ?? item.toCityId);
    const quantity = transport
      ? 1
      : (dto.quantity ??
        defaultQuantity(item.company.service.kind, dto.startsAt, dto.endsAt));
    const cost = lineCost(item.costPerPerson, quantity);
    const candidate = {
      tripId,
      companyItemId: item.id,
      serviceId: item.company.serviceId,
      transportMode: transport ? item.company.transportMode : null,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      fromCityId: transport ? item.fromCityId : null,
      toCityId,
      unitCost: toMoney(item.costPerPerson),
      quantity,
      costSnapshot: cost.toFixed(2),
      profitMode: profit.mode,
      profitValue: toMoney(profit.value),
      sellingPrice: sellingPrice(cost, profit.mode, profit.value).toFixed(2),
      notes: dto.notes,
    };
    const existing = await this.prisma.tripServiceLine.findMany({
      where: { tripId },
      include: lineInclude,
    });
    const errors = routeErrors(trip, [
      ...existing.map((l) => this.routeLine(l)),
      {
        serviceKind: item.company.service.kind,
        transport,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        fromCityId: candidate.fromCityId,
        toCityId,
        label: item.name,
      },
    ]);
    if (errors.length) throw new BadRequestException(errors);

    return this.prisma.$transaction(async (tx) => {
      const line = await tx.tripServiceLine.create({
        data: { ...candidate, sequenceNo: 1000 + existing.length },
      });
      await this.resequenceAndPrice(tx, tripId);
      await this.audit.log(
        user,
        {
          action: 'trip.line_added',
          entityType: 'trip',
          entityId: tripId,
          summary: `${trip.code}: added "${item.name}"`,
          changes: {
            after: {
              item: item.name,
              quantity,
              cost: candidate.costSnapshot,
              profit,
            },
          },
        },
        tx,
      );
      return line;
    });
  }

  async updateLine(
    user: AuthUser,
    tripId: string,
    lineId: string,
    dto: UpdateLineDto,
  ) {
    const trip = await this.loadForEdit(user, tripId);
    await this.assertStructureEditable(user, trip);
    const lines = await this.prisma.tripServiceLine.findMany({
      where: { tripId },
      include: lineInclude,
    });
    const line = lines.find((l) => l.id === lineId);
    if (!line) throw new NotFoundException('Service line not found');
    const wantsProfit =
      dto.profitMode !== undefined || dto.profitValue !== undefined;
    if (wantsProfit && !user.permissions.includes('pricing.set_profit'))
      throw new ForbiddenException('Only the Admin sets profit (BR-08)');
    const next = {
      startsAt: dto.startsAt ?? line.startsAt,
      endsAt: dto.endsAt ?? line.endsAt,
      toCityId:
        line.service.kind === 'TRANSPORT'
          ? line.toCityId
          : (dto.toCityId ?? line.toCityId),
      profitMode: dto.profitMode ?? line.profitMode,
      profitValue: dto.profitValue ?? line.profitValue.toString(),
      quantity:
        line.service.kind === 'TRANSPORT'
          ? 1
          : (dto.quantity ??
            (dto.startsAt || dto.endsAt
              ? defaultQuantity(
                  line.service.kind,
                  dto.startsAt ?? line.startsAt,
                  dto.endsAt ?? line.endsAt,
                )
              : line.quantity)),
    };
    const cost = lineCost(line.unitCost, next.quantity);
    const errors = routeErrors(
      trip,
      lines.map((l) =>
        l.id === lineId
          ? {
              ...this.routeLine(l),
              startsAt: next.startsAt,
              endsAt: next.endsAt,
              toCityId: next.toCityId,
            }
          : this.routeLine(l),
      ),
    );
    if (errors.length) throw new BadRequestException(errors);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tripServiceLine.update({
        where: { id: lineId },
        data: {
          startsAt: next.startsAt,
          endsAt: next.endsAt,
          toCityId: next.toCityId,
          notes: dto.notes,
          quantity: next.quantity,
          costSnapshot: cost.toFixed(2),
          profitMode: next.profitMode,
          profitValue: toMoney(next.profitValue),
          sellingPrice: sellingPrice(
            cost,
            next.profitMode,
            next.profitValue,
          ).toFixed(2),
        },
      });
      await this.resequenceAndPrice(tx, tripId);
      await this.audit.log(
        user,
        {
          action: wantsProfit ? 'trip.profit_changed' : 'trip.line_updated',
          entityType: 'trip',
          entityId: tripId,
          summary: `${trip.code}: "${line.item.name}" updated`,
          changes: diff(
            { ...line, profitValue: line.profitValue.toString() } as never,
            dto as never,
          ),
        },
        tx,
      );
      return updated;
    });
  }

  async removeLine(user: AuthUser, tripId: string, lineId: string) {
    const trip = await this.loadForEdit(user, tripId);
    await this.assertStructureEditable(user, trip);
    const line = await this.prisma.tripServiceLine.findFirst({
      where: { id: lineId, tripId },
      include: lineInclude,
    });
    if (!line) throw new NotFoundException('Service line not found');
    if (trip.status === 'OPEN') {
      const rest = await this.prisma.tripServiceLine.findMany({
        where: { tripId, id: { not: lineId } },
        include: lineInclude,
      });
      const errors = publishErrors(
        trip,
        rest.map((l) => this.routeLine(l)),
      );
      if (errors.length)
        throw new BadRequestException([
          'An open trip must stay valid:',
          ...errors,
        ]);
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.tripServiceLine.delete({ where: { id: lineId } });
      await this.resequenceAndPrice(tx, tripId);
      await this.audit.log(
        user,
        {
          action: 'trip.line_removed',
          entityType: 'trip',
          entityId: tripId,
          summary: `${trip.code}: removed "${line.item.name}"`,
        },
        tx,
      );
      return { deleted: true };
    });
  }

  /**
   * INT-07: the Admin accepts the suppliers' current costs. Line costs are re-snapshotted, prices
   * recomputed, the "cost changed" flag cleared. Existing bookings keep their own snapshots.
   */
  async acceptCurrentCosts(user: AuthUser, tripId: string) {
    const trip = await this.loadForEdit(user, tripId);
    if (!EDITABLE.includes(trip.status))
      throw new ConflictException('Only draft or open trips can be repriced');
    return this.prisma.$transaction(async (tx) => {
      const lines = await tx.tripServiceLine.findMany({
        where: { tripId },
        include: { item: true },
      });
      const changes: { line: string; from: string; to: string }[] = [];
      for (const l of lines) {
        if (!D(l.unitCost).eq(l.item.costPerPerson))
          changes.push({
            line: l.item.name,
            from: l.unitCost.toString(),
            to: l.item.costPerPerson.toString(),
          });
        const cost = lineCost(l.item.costPerPerson, l.quantity);
        await tx.tripServiceLine.update({
          where: { id: l.id },
          data: {
            unitCost: toMoney(l.item.costPerPerson),
            costSnapshot: cost.toFixed(2),
            sellingPrice: sellingPrice(
              cost,
              l.profitMode,
              l.profitValue,
            ).toFixed(2),
          },
        });
      }
      await tx.trip.update({
        where: { id: tripId },
        data: { costChangedAt: null },
      });
      const totals = await this.resequenceAndPrice(tx, tripId);
      await this.audit.log(
        user,
        {
          action: 'trip.costs_accepted',
          entityType: 'trip',
          entityId: tripId,
          summary: `${trip.code}: supplier costs accepted, new price ${totals.pricePerPerson}`,
          changes: { after: changes },
        },
        tx,
      );
      return totals;
    });
  }

  // ------------------------------------------------------------------ pickup points, guides

  async addPickupPoint(user: AuthUser, tripId: string, dto: PickupPointDto) {
    const trip = await this.loadForEdit(user, tripId);
    if (dto.cityId === trip.originCityId)
      throw new BadRequestException(
        'The origin is already the default boarding point',
      );
    if (
      dto.surcharge &&
      !user.permissions.includes('pricing.set_profit') &&
      !D(dto.surcharge).isZero()
    )
      throw new ForbiddenException('Only the Admin sets a surcharge');
    const city = await this.prisma.city.findFirst({
      where: { id: dto.cityId, isActive: true },
    });
    if (!city) throw new NotFoundException('City not found or disabled');
    const point = await this.prisma.tripPickupPoint.create({
      data: {
        tripId,
        cityId: dto.cityId,
        pickupTime: dto.pickupTime,
        surcharge: toMoney(dto.surcharge ?? 0),
        notes: dto.notes,
      },
    });
    await this.audit.log(user, {
      action: 'trip.pickup_added',
      entityType: 'trip',
      entityId: tripId,
      summary: `${trip.code}: boarding point ${city.nameEn} (+${point.surcharge.toString()})`,
    });
    return point;
  }

  async removePickupPoint(user: AuthUser, tripId: string, pointId: string) {
    const trip = await this.loadForEdit(user, tripId);
    const point = await this.prisma.tripPickupPoint.findFirst({
      where: { id: pointId, tripId },
      include: {
        _count: {
          select: { bookings: { where: { status: { not: 'CANCELLED' } } } },
        },
      },
    });
    if (!point) throw new NotFoundException('Boarding point not found');
    if (point._count.bookings)
      throw new ConflictException('Active bookings board at this point');
    await this.prisma.tripPickupPoint.delete({ where: { id: pointId } });
    await this.audit.log(user, {
      action: 'trip.pickup_removed',
      entityType: 'trip',
      entityId: tripId,
      summary: `${trip.code}: boarding point removed`,
    });
    return { deleted: true };
  }

  /** TRP-11: guides of the trip's branch (any branch for shared trips). */
  async setGuides(user: AuthUser, tripId: string, userIds: string[]) {
    const trip = await this.loadForEdit(user, tripId);
    const guides = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        isActive: true,
        role: { code: 'TOUR_GUIDE' },
        ...(trip.branchId ? { branchId: trip.branchId } : {}),
      },
      select: { id: true, fullName: true },
    });
    if (guides.length !== userIds.length)
      throw new BadRequestException(
        'Every guide must be an active tour guide of the trip’s branch',
      );
    await this.prisma.$transaction([
      this.prisma.tripGuide.deleteMany({ where: { tripId } }),
      this.prisma.tripGuide.createMany({
        data: userIds.map((userId) => ({ tripId, userId })),
      }),
    ]);
    await this.audit.log(user, {
      action: 'trip.guides_set',
      entityType: 'trip',
      entityId: tripId,
      summary: `${trip.code}: guides ${guides.map((g) => g.fullName).join(', ') || 'none'}`,
    });
    return guides;
  }

  // ------------------------------------------------------------------ lifecycle

  /** DRAFT → OPEN (TRP-03, TRP-08). */
  async publish(user: AuthUser, id: string) {
    const trip = await this.loadForEdit(user, id);
    if (trip.status !== 'DRAFT')
      throw new ConflictException(
        `Only a draft can be published (now ${trip.status})`,
      );
    const lines = await this.prisma.tripServiceLine.findMany({
      where: { tripId: id },
      include: lineInclude,
    });
    const errors = publishErrors(
      trip,
      lines.map((l) => this.routeLine(l)),
    );
    if (trip.registrationDeadline <= new Date())
      errors.push('The registration deadline is already in the past');
    if (D(trip.pricePerPerson).lte(0)) errors.push('The trip has no price yet');
    if (lines.some((l) => !l.item.isActive || !l.item.company.isActive))
      errors.push('A service of this trip uses a deactivated company or item');
    if (errors.length) throw new BadRequestException(errors);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id },
        data: { status: 'OPEN' },
      });
      await this.audit.log(
        user,
        {
          action: 'trip.published',
          entityType: 'trip',
          entityId: id,
          summary: `${trip.code} published at ${trip.pricePerPerson.toString()} ${trip.currencyCode}`,
        },
        tx,
      );
      return updated;
    });
  }

  async setPublic(user: AuthUser, id: string, isPublic: boolean) {
    const trip = await this.loadForEdit(user, id);
    const updated = await this.prisma.trip.update({
      where: { id },
      data: { isPublic },
    });
    await this.audit.log(user, {
      action: isPublic ? 'trip.made_public' : 'trip.made_private',
      entityType: 'trip',
      entityId: id,
      summary: `${trip.code} ${isPublic ? 'shown on' : 'hidden from'} the public page`,
    });
    return updated;
  }

  close(user: AuthUser, id: string) {
    return this.lifecycle.closeTrip(user, id);
  }

  decide(user: AuthUser, id: string, dto: DecisionDto) {
    return this.lifecycle.decideTrip(user, id, dto);
  }

  cancel(user: AuthUser, id: string, reason: string) {
    return this.lifecycle.cancelTrip(user, id, reason);
  }

  /** TRP-14: a new draft with the same services, shifted to new dates, priced at today's costs. */
  async clone(user: AuthUser, id: string, startsAt: Date) {
    const src = await this.loadForEdit(user, id);
    const shift = startsAt.getTime() - src.startsAt.getTime();
    const move = (d: Date) => new Date(d.getTime() + shift);
    if (move(src.registrationDeadline) <= new Date())
      throw new BadRequestException(
        'With this start date the registration deadline would already be over',
      );
    const lines = await this.prisma.tripServiceLine.findMany({
      where: { tripId: id },
      include: { item: true },
    });
    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.trip.create({
        data: {
          code: await tripCode(tx),
          title: src.title,
          description: src.description,
          categoryId: src.categoryId,
          branchId: src.branchId,
          originCityId: src.originCityId,
          destinationCityId: src.destinationCityId,
          scope: src.scope,
          startsAt: move(src.startsAt),
          endsAt: move(src.endsAt),
          registrationDeadline: move(src.registrationDeadline),
          minPassengers: src.minPassengers,
          maxPassengers: src.maxPassengers,
          currencyCode: src.currencyCode,
          coverImageUrl: src.coverImageUrl,
          terms: src.terms,
          createdById: user.userId,
          lines: {
            create: lines.map((l) => ({
              companyItemId: l.companyItemId,
              serviceId: l.serviceId,
              transportMode: l.transportMode,
              sequenceNo: l.sequenceNo,
              startsAt: move(l.startsAt),
              endsAt: move(l.endsAt),
              fromCityId: l.fromCityId,
              toCityId: l.toCityId,
              unitCost: toMoney(l.item.costPerPerson),
              quantity: l.quantity,
              costSnapshot: lineCost(l.item.costPerPerson, l.quantity).toFixed(
                2,
              ),
              profitMode: l.profitMode,
              profitValue: l.profitValue,
              sellingPrice: sellingPrice(
                lineCost(l.item.costPerPerson, l.quantity),
                l.profitMode,
                l.profitValue,
              ).toFixed(2),
              notes: l.notes,
            })),
          },
        },
      });
      await this.resequenceAndPrice(tx, copy.id);
      await this.audit.log(
        user,
        {
          action: 'trip.cloned',
          entityType: 'trip',
          entityId: copy.id,
          summary: `${copy.code} cloned from ${src.code}`,
        },
        tx,
      );
      return copy;
    });
  }

  // ------------------------------------------------------------------ passengers (BKG-10, CLS-06, DSH-04)

  async passengers(user: AuthUser, id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { AND: [{ id }, productVisibility(user)] },
      select: { id: true, code: true, title: true, branchId: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    const rows = await this.prisma.$queryRaw<
      { passenger_id: string; booking_id: string; program_id: string | null }[]
    >`
      SELECT passenger_id, booking_id, program_id FROM v_trip_passengers WHERE trip_id = ${id}::uuid AND status = 'CONFIRMED'`;
    const viaProgram = new Map(rows.map((r) => [r.passenger_id, r.program_id]));
    const passengers = await this.prisma.bookingPassenger.findMany({
      where: { id: { in: rows.map((r) => r.passenger_id) } },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            gender: true,
            birthDate: true,
            nationality: { select: { nameAr: true, isoCode: true } },
          },
        },
        document: {
          select: { docType: true, docNumber: true, expiresOn: true },
        },
        visas: {
          select: { status: true, country: { select: { nameAr: true } } },
        },
        booking: {
          select: {
            id: true,
            bookingNo: true,
            branchId: true,
            pickupPoint: {
              select: { city: { select: { nameAr: true } }, pickupTime: true },
            },
            program: { select: { code: true, title: true } },
          },
        },
      },
      orderBy: [{ booking: { bookingNo: 'asc' } }, { sortOrder: 'asc' }],
    });
    return {
      trip,
      total: passengers.length,
      passengers: passengers.map((p) => ({
        ...p,
        viaProgramId: viaProgram.get(p.id) ?? null,
      })),
    };
  }

  async setAttendance(
    user: AuthUser,
    tripId: string,
    passengerId: string,
    dto: AttendanceDto,
  ) {
    const { trip, passengers } = await this.passengers(user, tripId);
    if (!passengers.some((p) => p.id === passengerId))
      throw new NotFoundException('Passenger not found on this trip');
    const updated = await this.prisma.bookingPassenger.update({
      where: { id: passengerId },
      data: { attendance: dto.attendance, guideNote: dto.guideNote },
    });
    await this.audit.log(user, {
      action: 'trip.attendance',
      entityType: 'trip',
      entityId: tripId,
      summary: `${trip.code}: attendance ${dto.attendance ?? 'cleared'}`,
    });
    return updated;
  }

  // ------------------------------------------------------------------ internals

  /** Sequence = time order; trip price = Σ lines; programs containing it are repriced (BR-06, BR-07). */
  async resequenceAndPrice(tx: Tx, tripId: string) {
    const lines = orderLines(
      await tx.tripServiceLine.findMany({ where: { tripId } }),
    );
    // two passes avoid colliding with the (trip_id, sequence_no) unique index
    for (const [i, l] of lines.entries())
      await tx.tripServiceLine.update({
        where: { id: l.id },
        data: { sequenceNo: 10_000 + i },
      });
    for (const [i, l] of lines.entries())
      await tx.tripServiceLine.update({
        where: { id: l.id },
        data: { sequenceNo: i + 1 },
      });
    const totals = tripTotals(lines);
    await tx.trip.update({ where: { id: tripId }, data: totals });
    await this.lifecycle.repriceProgramsOf(tx, tripId);
    return totals;
  }

  routeLine(
    l: Prisma.TripServiceLineGetPayload<{ include: typeof lineInclude }>,
  ): RouteLine {
    return {
      id: l.id,
      serviceKind: l.service.kind,
      transport: l.service.kind === 'TRANSPORT',
      startsAt: l.startsAt,
      endsAt: l.endsAt,
      fromCityId: l.fromCityId,
      toCityId: l.toCityId,
      label: l.item.name,
    };
  }

  private async profitFor(
    user: AuthUser,
    serviceId: string,
    companyId: string,
    dto: { profitMode?: 'PERCENT' | 'FIXED'; profitValue?: string },
  ) {
    if (dto.profitMode !== undefined || dto.profitValue !== undefined) {
      if (!user.permissions.includes('pricing.set_profit'))
        throw new ForbiddenException('Only the Admin sets profit (BR-08)');
      if (!dto.profitMode || dto.profitValue === undefined)
        throw new BadRequestException('Give both profitMode and profitValue');
      return { mode: dto.profitMode, value: dto.profitValue };
    }
    return this.suppliers.defaultProfit(this.prisma, serviceId, companyId);
  }

  private async loadForEdit(user: AuthUser, id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { AND: [{ id }, productVisibility(user)] },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    assertCanEditProduct(user, trip);
    if (trip.status === 'CANCELLED' || trip.status === 'COMPLETED')
      throw new ConflictException(
        `The trip is ${trip.status.toLowerCase()} and can no longer change`,
      );
    return trip;
  }

  /** TRP-13: once bookings exist, dates and services change only by the Admin (audited). */
  private async assertStructureEditable(
    user: AuthUser,
    trip: { id: string; status: string; code: string },
  ) {
    if (!EDITABLE.includes(trip.status))
      throw new ConflictException(
        `Services and dates are frozen once registration is ${trip.status.toLowerCase()}`,
      );
    const active = await this.prisma.booking.count({
      where: {
        status: { not: 'CANCELLED' },
        OR: [
          { tripId: trip.id },
          { program: { legs: { some: { tripId: trip.id } } } },
        ],
      },
    });
    if (active && !isAll(user))
      throw new ForbiddenException(
        'This trip already has bookings; only the Admin can change its dates or services (TRP-13)',
      );
  }

  private async validateFrame(t: {
    originCityId: string;
    destinationCityId: string;
    startsAt: Date;
    endsAt: Date;
    registrationDeadline: Date;
    minPassengers: number;
    maxPassengers: number;
  }) {
    const errors: string[] = [];
    if (t.endsAt < t.startsAt) errors.push('The trip ends before it starts');
    if (t.registrationDeadline > t.startsAt)
      errors.push('The registration deadline must be before the trip starts');
    if (t.maxPassengers < t.minPassengers)
      errors.push('Maximum passengers must be at least the minimum');
    if (t.originCityId === t.destinationCityId)
      errors.push('Origin and destination must be different');
    const cities = await this.prisma.city.findMany({
      where: { id: { in: [t.originCityId, t.destinationCityId] } },
      include: { country: true },
    });
    if (cities.length !== 2) errors.push('Origin or destination not found');
    if (errors.length) throw new BadRequestException(errors);
    return travelScope(cities.map((c) => c.country.isoCode));
  }

  private async assertRefs(
    categoryId: string,
    branchId: string | null,
    currencyCode: string,
  ) {
    const [category, branch, currency] = await Promise.all([
      this.prisma.tripCategory.findFirst({
        where: { id: categoryId, isActive: true },
      }),
      branchId
        ? this.prisma.branch.findFirst({
            where: { id: branchId, isActive: true },
          })
        : Promise.resolve(true),
      this.prisma.currency.findUnique({ where: { code: currencyCode } }),
    ]);
    if (!category)
      throw new NotFoundException('Category not found or disabled');
    if (!branch) throw new NotFoundException('Branch not found or deactivated');
    if (!currency) throw new NotFoundException('Unknown currency');
  }
}
