import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { paginate } from '../common/dto/pagination.dto';
import { assertBranchAccess, branchWhere, officeUser, resolveBranchId } from '../common/scope';
import { D, toMoney } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';
import { activeOffer, isoDate, priceServices, toDate, todayIso } from './pricing';
import {
  CreateOfferDto,
  CreateTripDto,
  RegistrationDecisionDto,
  ReplaceServicesDto,
  SetSupervisorsDto,
  TripQueryDto,
  TripServiceDto,
  UpdateOfferDto,
  UpdateTripDto,
} from './trips.dto';

const LIVE_STATUSES = ['OPEN', 'REGISTRATION_CLOSED', 'APPROVED'] as const;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registration closes automatically once the (possibly extended) deadline has passed; the trip then
   * waits for the admin decision. Run lazily before reads/bookings so no scheduler is required.
   */
  async closeExpiredRegistrations(officeId: string, tx: Tx = this.prisma) {
    await tx.$executeRaw`
      UPDATE trips SET status = 'REGISTRATION_CLOSED', updated_at = now()
      WHERE office_id = ${officeId}::uuid AND status = 'OPEN'
        AND COALESCE(registration_extended_until, registration_deadline) < CURRENT_DATE`;
  }

  // ------------------------------------------------------------------ queries

  async list(user: AuthUser, q: TripQueryDto) {
    const u = officeUser(user);
    await this.closeExpiredRegistrations(u.officeId);
    const today = toDate(todayIso());
    const where: Prisma.TripWhereInput = {
      ...branchWhere(user),
      ...(q.branchId && u.scope === 'OFFICE' ? { branchId: q.branchId } : {}),
      ...(q.tourId ? { tourId: q.tourId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.tripType ? { tripType: q.tripType } : {}),
      ...(q.when === 'upcoming' ? { departureDate: { gte: today } } : q.when === 'past' ? { departureDate: { lt: today } } : {}),
      ...(q.search
        ? { OR: [{ code: { contains: q.search, mode: 'insensitive' } }, { tour: { name: { contains: q.search, mode: 'insensitive' } } }, { tour: { destination: { contains: q.search, mode: 'insensitive' } } }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        include: {
          tour: { select: { id: true, name: true, destination: true, days: true, nights: true, coverImageUrl: true, category: { select: { name: true, nameAr: true } } } },
          branch: { select: { id: true, name: true } },
          offers: true,
          _count: { select: { bookings: { where: { status: 'PENDING' } } } },
        },
        orderBy: { departureDate: q.when === 'past' || q.order === 'DESC' ? 'desc' : 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.trip.count({ where }),
    ]);
    return paginate(
      rows.map(({ offers, _count, ...t }) => ({ ...t, ...this.summary(t), activeOffer: activeOffer(offers), pendingBookings: _count.bookings })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async get(user: AuthUser, id: string) {
    const u = officeUser(user);
    await this.closeExpiredRegistrations(u.officeId);
    const trip = await this.prisma.trip.findFirst({
      where: { id, ...branchWhere(user) },
      include: {
        tour: { include: { category: true, itinerary: { orderBy: { dayNumber: 'asc' } } } },
        branch: { select: { id: true, name: true } },
        services: { include: { supplier: { select: { id: true, name: true, type: true, phone: true } } }, orderBy: { serviceType: 'asc' } },
        offers: { orderBy: { startsAt: 'desc' } },
        supervisors: { include: { member: { select: { id: true, user: { select: { fullName: true } } } } } },
        decisions: { orderBy: { createdAt: 'desc' }, include: { decidedBy: { select: { user: { select: { fullName: true } } } } } },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return { ...this.summary(trip), ...trip, activeOffer: activeOffer(trip.offers), financials: await this.financials(trip) };
  }

  /** Per-person price breakdown plus expected vs realised money for the trip (financial roles). */
  private async financials(trip: { id: string; officeId: string; confirmedSeats: number; services: Array<{ supplierId: string; serviceType: string; costPerPerson: Prisma.Decimal; profitPercent: Prisma.Decimal; sellingPricePerPerson: Prisma.Decimal; supplier: { name: string } }> }) {
    const pricing = priceServices(trip.services);
    const [confirmed] = await this.prisma.$queryRaw<Array<{ revenue: string; cost: string; paid: string; bookings: bigint }>>`
      SELECT COALESCE(SUM(total_amount), 0)::text AS revenue,
             COALESCE(SUM(unit_cost * passenger_count), 0)::text AS cost,
             COALESCE(SUM(paid_amount), 0)::text AS paid,
             COUNT(*) AS bookings
      FROM bookings WHERE trip_id = ${trip.id}::uuid AND status = 'CONFIRMED'`;
    const supplierPaid = await this.prisma.supplierPayment.groupBy({
      by: ['supplierId'],
      where: { tripId: trip.id },
      _sum: { amount: true },
    });
    const paidBySupplier = new Map(supplierPaid.map((p) => [p.supplierId, D(p._sum.amount)]));

    return {
      perPerson: {
        cost: toMoney(pricing.costPerPerson),
        selling: toMoney(pricing.sellingPricePerPerson),
        margin: toMoney(pricing.marginPerPerson),
        lines: trip.services.map((s, i) => ({
          serviceType: s.serviceType,
          supplier: s.supplier.name,
          cost: toMoney(s.costPerPerson),
          profitPercent: toMoney(s.profitPercent),
          selling: toMoney(s.sellingPricePerPerson),
          margin: toMoney(pricing.lines[i].marginPerPerson),
        })),
      },
      confirmed: {
        passengers: trip.confirmedSeats,
        bookings: Number(confirmed.bookings),
        /** What confirmed customers owe in total (after discounts) */
        revenue: toMoney(confirmed.revenue),
        /** Net supplier cost of confirmed passengers (booking snapshots) */
        supplierCost: toMoney(confirmed.cost),
        expectedProfit: toMoney(D(confirmed.revenue).sub(confirmed.cost)),
        collected: toMoney(confirmed.paid),
        outstanding: toMoney(D(confirmed.revenue).sub(confirmed.paid)),
      },
      /** What the office owes each supplier for confirmed passengers vs what it already paid */
      supplierDues: trip.services.map((s) => {
        const due = D(s.costPerPerson).mul(trip.confirmedSeats);
        const paid = paidBySupplier.get(s.supplierId) ?? D(0);
        return { supplierId: s.supplierId, supplier: s.supplier.name, serviceType: s.serviceType, due: toMoney(due), paid: toMoney(paid), remaining: toMoney(due.sub(paid)) };
      }),
    };
  }

  // ------------------------------------------------------------------ commands

  async create(user: AuthUser, dto: CreateTripDto) {
    const u = officeUser(user);
    const branchId = resolveBranchId(user, dto.branchId);
    const tour = await this.prisma.tour.findFirst({ where: { id: dto.tourId, officeId: u.officeId } });
    if (!tour) throw new NotFoundException('Tour not found');
    if (!tour.isActive) throw new BadRequestException('This tour is inactive and cannot be scheduled');
    await this.assertBranch(u.officeId, branchId);
    await this.assertCurrency(u.officeId, dto.currencyCode);

    const departure = dto.departureDate;
    const ret = dto.returnDate ?? isoDate(new Date(toDate(departure).getTime() + tour.nights * 86_400_000));
    this.assertSchedule(departure, ret, dto.registrationDeadline, dto.minPassengers, dto.maxSeats);
    const services = await this.validateServices(u.officeId, dto.services ?? []);
    const pricing = priceServices(services);

    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          officeId: u.officeId,
          branchId,
          tourId: tour.id,
          code: dto.code.toUpperCase(),
          tripType: dto.tripType,
          departureDate: toDate(departure),
          returnDate: toDate(ret),
          currencyCode: dto.currencyCode.toUpperCase(),
          minPassengers: dto.minPassengers,
          maxSeats: dto.maxSeats,
          registrationDeadline: toDate(dto.registrationDeadline),
          isPublic: dto.isPublic ?? false,
          notes: dto.notes,
          costPerPerson: toMoney(pricing.costPerPerson),
          sellingPricePerPerson: toMoney(pricing.sellingPricePerPerson),
          services: { create: services.map((s, i) => ({ ...s, sellingPricePerPerson: toMoney(pricing.lines[i].sellingPricePerPerson) })) },
        },
      });
      await this.audit.log(user, { action: 'trip.created', entityType: 'trip', entityId: trip.id, summary: `Scheduled trip ${trip.code} (${tour.name})` }, tx);
      return trip;
    }).then((t) => this.get(user, t.id));
  }

  async update(user: AuthUser, id: string, dto: UpdateTripDto) {
    const u = officeUser(user);
    const trip = await this.owned(user, id);
    if (['COMPLETED', 'CANCELLED'].includes(trip.status)) throw new ConflictException('Completed or cancelled trips cannot be edited');
    const bookings = await this.prisma.booking.count({ where: { tripId: id, status: { not: 'CANCELLED' } } });
    if (bookings && (dto.tourId || dto.currencyCode || dto.branchId)) {
      throw new ConflictException('Tour, branch and currency cannot change once the trip has bookings');
    }
    if (dto.branchId) {
      resolveBranchId(user, dto.branchId);
      await this.assertBranch(u.officeId, dto.branchId);
    }
    if (dto.currencyCode) await this.assertCurrency(u.officeId, dto.currencyCode);
    if (dto.tourId && !(await this.prisma.tour.findFirst({ where: { id: dto.tourId, officeId: u.officeId, isActive: true } }))) {
      throw new NotFoundException('Tour not found');
    }
    const maxSeats = dto.maxSeats ?? trip.maxSeats;
    if (maxSeats < trip.confirmedSeats) {
      throw new ConflictException(`Capacity cannot be lower than the ${trip.confirmedSeats} confirmed seats`);
    }
    this.assertSchedule(
      dto.departureDate ?? isoDate(trip.departureDate),
      dto.returnDate ?? isoDate(trip.returnDate),
      dto.registrationDeadline ?? isoDate(trip.registrationDeadline),
      dto.minPassengers ?? trip.minPassengers,
      maxSeats,
    );

    const { services, ...data } = dto;
    await this.prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id },
        data: {
          ...data,
          code: data.code?.toUpperCase(),
          currencyCode: data.currencyCode?.toUpperCase(),
          departureDate: data.departureDate ? toDate(data.departureDate) : undefined,
          returnDate: data.returnDate ? toDate(data.returnDate) : undefined,
          registrationDeadline: data.registrationDeadline ? toDate(data.registrationDeadline) : undefined,
        },
      });
      if (services) await this.writeServices(tx, trip, services);
      await this.audit.log(user, { action: 'trip.updated', entityType: 'trip', entityId: id, summary: `Updated trip ${trip.code}` }, tx);
    });
    return this.get(user, id);
  }

  /** Replace the services (max one per type). Existing bookings keep their price snapshots. */
  async replaceServices(user: AuthUser, id: string, dto: ReplaceServicesDto) {
    const trip = await this.owned(user, id);
    if (['COMPLETED', 'CANCELLED'].includes(trip.status)) throw new ConflictException('Completed or cancelled trips cannot be repriced');
    await this.prisma.$transaction(async (tx) => {
      await this.writeServices(tx, trip, dto.services);
      await this.audit.log(user, { action: 'trip.repriced', entityType: 'trip', entityId: id, summary: `Updated services and prices of ${trip.code}` }, tx);
    });
    return this.get(user, id);
  }

  /** DRAFT → OPEN. Only a fully configured trip can take bookings. */
  async open(user: AuthUser, id: string) {
    const trip = await this.owned(user, id, { services: true, tour: true });
    if (trip.status !== 'DRAFT') throw new ConflictException(`Only draft trips can be opened (this one is ${trip.status})`);
    if (!trip.services.length || D(trip.sellingPricePerPerson).lte(0)) {
      throw new BadRequestException('Add at least one supplier service with a price before opening registration');
    }
    if (!trip.tour.isActive) throw new BadRequestException('The tour of this trip is inactive');
    if (isoDate(trip.registrationDeadline) < todayIso()) throw new BadRequestException('The registration deadline has already passed');
    return this.setStatus(user, trip, 'OPEN', 'trip.opened', `Opened registration for ${trip.code}`);
  }

  /** OPEN → DRAFT, only while nobody has booked. */
  async unpublish(user: AuthUser, id: string) {
    const trip = await this.owned(user, id);
    if (trip.status !== 'OPEN') throw new ConflictException('Only open trips can be moved back to draft');
    if (await this.prisma.booking.count({ where: { tripId: id, status: { not: 'CANCELLED' } } })) {
      throw new ConflictException('This trip already has bookings');
    }
    return this.setStatus(user, trip, 'DRAFT', 'trip.unpublished', `Moved ${trip.code} back to draft`);
  }

  async complete(user: AuthUser, id: string) {
    const trip = await this.owned(user, id);
    if (trip.status !== 'APPROVED') throw new ConflictException('Only approved trips can be marked completed');
    if (isoDate(trip.returnDate) > todayIso()) throw new ConflictException('The trip has not returned yet');
    return this.setStatus(user, trip, 'COMPLETED', 'trip.completed', `Marked ${trip.code} as completed`);
  }

  /**
   * Admin decision after the registration deadline: approve execution, cancel the trip (all its
   * bookings are cancelled and seats released; payments stay for manual refunds) or extend registration.
   */
  async decide(user: AuthUser, id: string, dto: RegistrationDecisionDto) {
    const u = officeUser(user);
    await this.closeExpiredRegistrations(u.officeId);
    const trip = await this.owned(user, id);
    if (!['OPEN', 'REGISTRATION_CLOSED'].includes(trip.status)) {
      throw new ConflictException(`A decision is only possible while registration is open or awaiting a decision (status: ${trip.status})`);
    }
    if (dto.decision === 'EXTEND') {
      if (!dto.newDeadline) throw new BadRequestException('newDeadline is required to extend registration');
      const current = isoDate(trip.registrationExtendedUntil ?? trip.registrationDeadline);
      if (dto.newDeadline <= current) throw new BadRequestException('The new deadline must be after the current one');
      if (dto.newDeadline < todayIso()) throw new BadRequestException('The new deadline cannot be in the past');
      if (dto.newDeadline > isoDate(trip.departureDate)) throw new BadRequestException('Registration must close on or before departure');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tripRegistrationDecision.create({
        data: {
          tripId: id,
          decision: dto.decision,
          confirmedAtDecision: trip.confirmedSeats,
          minPassengers: trip.minPassengers,
          previousDeadline: trip.registrationExtendedUntil ?? trip.registrationDeadline,
          newDeadline: dto.newDeadline ? toDate(dto.newDeadline) : null,
          note: dto.note,
          decidedById: u.memberId,
        },
      });
      if (dto.decision === 'APPROVE') {
        await tx.trip.update({ where: { id }, data: { status: 'APPROVED' } });
      } else if (dto.decision === 'EXTEND') {
        await tx.trip.update({ where: { id }, data: { status: 'OPEN', registrationExtendedUntil: toDate(dto.newDeadline!) } });
      } else {
        const active = await tx.booking.findMany({ where: { tripId: id, status: { not: 'CANCELLED' } }, select: { id: true } });
        await tx.booking.updateMany({
          where: { tripId: id, status: { not: 'CANCELLED' } },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Trip cancelled by the office' },
        });
        if (active.length) {
          await tx.bookingEvent.createMany({
            data: active.map((b) => ({ bookingId: b.id, type: 'CANCELLED' as const, actorId: u.memberId, data: { reason: 'TRIP_CANCELLED' } })),
          });
        }
        await tx.trip.update({ where: { id }, data: { status: 'CANCELLED', confirmedSeats: 0 } });
      }
      await this.audit.log(
        user,
        {
          action: `trip.decision.${dto.decision.toLowerCase()}`,
          entityType: 'trip',
          entityId: id,
          summary: `${dto.decision} ${trip.code} with ${trip.confirmedSeats}/${trip.minPassengers} confirmed passengers`,
          metadata: { ...dto },
        },
        tx,
      );
    });
    return this.get(user, id);
  }

  async setSupervisors(user: AuthUser, id: string, dto: SetSupervisorsDto) {
    const u = officeUser(user);
    const trip = await this.owned(user, id);
    const members = await this.prisma.officeMember.findMany({
      where: { id: { in: dto.memberIds }, officeId: u.officeId, isActive: true },
      include: { role: true },
    });
    if (members.length !== dto.memberIds.length) throw new BadRequestException('Unknown or inactive employee');
    const outside = members.filter((m) => m.branchId !== trip.branchId && m.role.scope !== 'OFFICE');
    if (outside.length) throw new BadRequestException('Supervisors must work in the trip\'s branch');
    await this.prisma.$transaction([
      this.prisma.tripSupervisor.deleteMany({ where: { tripId: id } }),
      this.prisma.tripSupervisor.createMany({ data: dto.memberIds.map((memberId) => ({ tripId: id, memberId })) }),
    ]);
    return this.get(user, id);
  }

  // ------------------------------------------------------------------ offers

  async createOffer(user: AuthUser, tripId: string, dto: CreateOfferDto) {
    const trip = await this.owned(user, tripId);
    await this.assertOffer(trip, dto);
    const offer = await this.prisma.tripOffer.create({
      data: { ...dto, officeId: trip.officeId, tripId, startsAt: toDate(dto.startsAt), endsAt: toDate(dto.endsAt) },
    });
    await this.audit.log(user, { action: 'offer.created', entityType: 'trip', entityId: tripId, summary: `Offer "${dto.title}" on ${trip.code}` });
    return offer;
  }

  async updateOffer(user: AuthUser, offerId: string, dto: UpdateOfferDto) {
    const offer = await this.prisma.tripOffer.findFirst({ where: { id: offerId, officeId: officeUser(user).officeId } });
    if (!offer) throw new NotFoundException('Offer not found');
    const trip = await this.owned(user, offer.tripId);
    const merged = {
      discountType: dto.discountType ?? offer.discountType,
      discountValue: dto.discountValue ?? offer.discountValue.toString(),
      startsAt: dto.startsAt ?? isoDate(offer.startsAt),
      endsAt: dto.endsAt ?? isoDate(offer.endsAt),
      isActive: dto.isActive ?? offer.isActive,
    };
    await this.assertOffer(trip, merged, offerId);
    // Bookings keep the discount snapshot they were created with.
    return this.prisma.tripOffer.update({
      where: { id: offerId },
      data: { ...dto, startsAt: dto.startsAt ? toDate(dto.startsAt) : undefined, endsAt: dto.endsAt ? toDate(dto.endsAt) : undefined },
    });
  }

  async deleteOffer(user: AuthUser, offerId: string) {
    const offer = await this.prisma.tripOffer.findFirst({ where: { id: offerId, officeId: officeUser(user).officeId } });
    if (!offer) throw new NotFoundException('Offer not found');
    await this.owned(user, offer.tripId);
    const used = await this.prisma.booking.count({ where: { offerId } });
    if (used) {
      await this.prisma.tripOffer.update({ where: { id: offerId }, data: { isActive: false } });
      return { deleted: false, deactivated: true, reason: `Used by ${used} booking(s); deactivated instead` };
    }
    await this.prisma.tripOffer.delete({ where: { id: offerId } });
    return { deleted: true };
  }

  // ------------------------------------------------------------------ helpers

  /** Loads a trip the user may manage (404 outside office/branch scope). */
  async owned<I extends Prisma.TripInclude>(user: AuthUser, id: string, include?: I) {
    const trip = await this.prisma.trip.findFirst({ where: { id, officeId: officeUser(user).officeId }, include });
    assertBranchAccess(user, trip, 'Trip');
    return trip as Prisma.TripGetPayload<{ include: I }>;
  }

  private summary(t: { maxSeats: number; confirmedSeats: number; minPassengers: number; departureDate: Date; registrationDeadline: Date; registrationExtendedUntil: Date | null }) {
    return {
      seatsAvailable: t.maxSeats - t.confirmedSeats,
      occupancyPct: Math.round((t.confirmedSeats / t.maxSeats) * 100),
      minimumReached: t.confirmedSeats >= t.minPassengers,
      registrationClosesOn: isoDate(t.registrationExtendedUntil ?? t.registrationDeadline),
    };
  }

  private async setStatus(user: AuthUser, trip: { id: string }, status: (typeof LIVE_STATUSES)[number] | 'DRAFT' | 'COMPLETED', action: string, summary: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.trip.update({ where: { id: trip.id }, data: { status } });
      await this.audit.log(user, { action, entityType: 'trip', entityId: trip.id, summary }, tx);
    });
    return this.get(user, trip.id);
  }

  private async writeServices(tx: Tx, trip: { id: string; officeId: string }, input: TripServiceDto[]) {
    const services = await this.validateServices(trip.officeId, input);
    const pricing = priceServices(services);
    await tx.tripService.deleteMany({ where: { tripId: trip.id } });
    if (services.length) {
      await tx.tripService.createMany({
        data: services.map((s, i) => ({ ...s, officeId: trip.officeId, tripId: trip.id, sellingPricePerPerson: toMoney(pricing.lines[i].sellingPricePerPerson) })),
      });
    }
    await tx.trip.update({
      where: { id: trip.id },
      data: { costPerPerson: toMoney(pricing.costPerPerson), sellingPricePerPerson: toMoney(pricing.sellingPricePerPerson) },
    });
  }

  /** One supplier per service type; the supplier must belong to the office, be active and match the type. */
  private async validateServices(officeId: string, services: TripServiceDto[]) {
    const types = services.map((s) => s.serviceType);
    if (new Set(types).size !== types.length) throw new BadRequestException('A trip can have only one supplier per service type');
    const suppliers = await this.prisma.supplier.findMany({ where: { id: { in: services.map((s) => s.supplierId) }, officeId } });
    for (const s of services) {
      const supplier = suppliers.find((x) => x.id === s.supplierId);
      if (!supplier) throw new BadRequestException('Supplier not found');
      if (!supplier.isActive) throw new BadRequestException(`Supplier "${supplier.name}" is inactive`);
      if (supplier.type !== s.serviceType) throw new BadRequestException(`"${supplier.name}" is not a ${s.serviceType.toLowerCase()} supplier`);
      if (D(s.costPerPerson).lt(0) || D(s.profitPercent).lt(0) || D(s.profitPercent).gt(1000)) {
        throw new BadRequestException('Cost must be ≥ 0 and profit between 0 and 1000 %');
      }
    }
    return services.map((s) => ({
      supplierId: s.supplierId,
      serviceType: s.serviceType,
      description: s.description,
      costPerPerson: toMoney(s.costPerPerson),
      profitPercent: toMoney(s.profitPercent),
    }));
  }

  private assertSchedule(departure: string, ret: string, deadline: string, min: number, max: number) {
    if (ret < departure) throw new BadRequestException('Return date must be on or after the departure date');
    if (deadline > departure) throw new BadRequestException('Registration must close on or before departure');
    if (min > max) throw new BadRequestException('Minimum passengers cannot exceed the maximum seats');
  }

  private async assertBranch(officeId: string, branchId: string) {
    if (!(await this.prisma.branch.findFirst({ where: { id: branchId, officeId, isActive: true } }))) {
      throw new BadRequestException('Branch not found or inactive');
    }
  }

  private async assertCurrency(officeId: string, code: string) {
    const ok = await this.prisma.officeCurrency.findUnique({ where: { officeId_currencyCode: { officeId, currencyCode: code.toUpperCase() } } });
    if (!ok) throw new BadRequestException(`The office does not work with ${code.toUpperCase()}`);
  }

  /** Valid value, valid period, below the trip price, and no overlap with another active offer. */
  private async assertOffer(
    trip: { id: string; sellingPricePerPerson: Prisma.Decimal },
    o: { discountType: string; discountValue: string; startsAt: string; endsAt: string; isActive?: boolean },
    exceptId?: string,
  ) {
    const value = D(o.discountValue);
    if (value.lte(0)) throw new BadRequestException('Discount must be greater than zero');
    if (o.discountType === 'PERCENTAGE' && value.gt(100)) throw new BadRequestException('A percentage discount cannot exceed 100');
    if (o.discountType === 'FIXED' && value.gte(D(trip.sellingPricePerPerson))) {
      throw new BadRequestException('A fixed discount must be below the trip price per person');
    }
    if (o.endsAt < o.startsAt) throw new BadRequestException('The offer must end on or after it starts');
    if (o.isActive === false) return;
    const overlap = await this.prisma.tripOffer.findFirst({
      where: {
        tripId: trip.id,
        isActive: true,
        id: exceptId ? { not: exceptId } : undefined,
        startsAt: { lte: toDate(o.endsAt) },
        endsAt: { gte: toDate(o.startsAt) },
      },
    });
    // How overlapping offers combine is an open business decision, so overlaps are refused.
    if (overlap) throw new ConflictException(`This period overlaps the active offer "${overlap.title}"`);
  }

  assertCanSupervise(user: AuthUser, trip: { supervisors: Array<{ memberId: string }> }) {
    const u = officeUser(user);
    if (u.scope !== 'OFFICE' && !trip.supervisors.some((s) => s.memberId === u.memberId)) {
      throw new ForbiddenException('Only the assigned supervisors can record attendance for this trip');
    }
  }
}
