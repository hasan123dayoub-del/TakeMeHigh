import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaymentState } from '@travelos/shared';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import {
  ilike,
  orderArgs,
  pageArgs,
  paginate,
} from '../common/dto/pagination.dto';
import {
  assertBranchRecord,
  branchOwned,
  isAll,
  productVisibility,
  programVisibility,
  writeBranchFor,
} from '../common/scope';
import { bookingNumber } from '../common/utils/codes';
import { D, toMoney } from '../common/utils/money';
import { checkDocuments, type DocCheck } from '../customers/document-rules';
import { CustomersService } from '../customers/customers.module';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';
import { LifecycleService } from '../products/lifecycle.service';
import { bestDiscount, isOfferLive } from '../products/rules';
import type {
  BookingQueryDto,
  CreateBookingDto,
  PassengerDto,
  TransferBookingDto,
  UpdatePassengersDto,
} from './bookings.dto';
import {
  releaseSeats,
  SeatsUnavailableError,
  takeSeats,
  type Target,
} from './seats';

/** Everything a booking needs to know about what is being booked. */
interface Product {
  target: Target;
  kind: 'TRIP' | 'PROGRAM' | 'OFFER';
  id: string;
  code: string;
  title: string;
  branchId: string | null;
  status: string;
  bookable: boolean;
  deadline: Date | null;
  scope: 'DOMESTIC' | 'INTERNATIONAL';
  startsAt: Date | null;
  endsAt: Date | null;
  currencyCode: string;
  pricePerPerson: string;
  costPerPerson: string;
  pickupPoints: { id: string; surcharge: Prisma.Decimal; cityId: string }[];
  discountTripId?: string;
  discountProgramId?: string;
  /** Foreign countries visited (visa per passenger, VIS-01) */
  visaCountryIds: string[];
}

export const bookingListInclude = {
  trip: { select: { id: true, code: true, title: true, startsAt: true } },
  program: { select: { id: true, code: true, title: true } },
  offer: { select: { id: true, title: true } },
  payer: { select: { id: true, fullName: true, phone: true } },
  branch: { select: { id: true, name: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.BookingInclude;

const detailInclude = {
  ...bookingListInclude,
  trip: {
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      scope: true,
      startsAt: true,
      endsAt: true,
      registrationDeadline: true,
      maxPassengers: true,
      confirmedSeats: true,
      originCity: { select: { nameAr: true } },
      destinationCity: { select: { nameAr: true } },
    },
  },
  program: {
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      scope: true,
      registrationDeadline: true,
      legs: {
        select: {
          trip: { select: { code: true, startsAt: true, endsAt: true } },
        },
        orderBy: { sequenceNo: 'asc' },
      },
    },
  },
  offer: {
    select: {
      id: true,
      title: true,
      kind: true,
      validFrom: true,
      validTo: true,
    },
  },
  pickupPoint: {
    include: { city: { select: { nameAr: true, nameEn: true } } },
  },
  passengers: {
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          birthDate: true,
          nationality: { select: { nameAr: true, isoCode: true } },
        },
      },
      document: {
        select: { id: true, docType: true, docNumber: true, expiresOn: true },
      },
      visas: { include: { country: { select: { nameAr: true } } } },
    },
    orderBy: { sortOrder: 'asc' },
  },
  payments: {
    include: { receivedBy: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
  },
  events: {
    include: { actor: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
  },
  convertedFrom: { select: { id: true, requestNo: true } },
} satisfies Prisma.BookingInclude;

/** Paid minus refunded; balance = total − net paid (B.6). */
export function money(b: {
  totalAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  refundedAmount: Prisma.Decimal;
}) {
  const netPaid = D(b.paidAmount).sub(D(b.refundedAmount));
  const balance = D(b.totalAmount).sub(netPaid);
  const state: PaymentState = netPaid.lte(0)
    ? 'UNPAID'
    : balance.lte(0)
      ? 'PAID'
      : 'PARTIAL';
  return {
    netPaid: netPaid.toFixed(2),
    balance: balance.toFixed(2),
    paymentState: state,
  };
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly customers: CustomersService,
    private readonly lifecycle: LifecycleService,
  ) {}

  // ------------------------------------------------------------------ read

  async list(user: AuthUser, q: BookingQueryDto) {
    const where: Prisma.BookingWhereInput = {
      AND: [
        branchOwned(user, q.branchId),
        q.status ? { status: q.status } : {},
        q.tripId ? { tripId: q.tripId } : {},
        q.programId ? { programId: q.programId } : {},
        q.offerId ? { offerId: q.offerId } : {},
        q.customerId
          ? {
              OR: [
                { payerCustomerId: q.customerId },
                { passengers: { some: { customerId: q.customerId } } },
              ],
            }
          : {},
        q.from || q.to
          ? {
              createdAt: {
                ...(q.from ? { gte: q.from } : {}),
                ...(q.to ? { lte: q.to } : {}),
              },
            }
          : {},
        q.search
          ? {
              OR: [
                { bookingNo: ilike(q.search) },
                { payer: { fullName: ilike(q.search) } },
                {
                  payer: {
                    phone: { contains: q.search.replace(/[\s()-]/g, '') },
                  },
                },
                {
                  passengers: {
                    some: { customer: { fullName: ilike(q.search) } },
                  },
                },
              ],
            }
          : {},
      ],
    };
    if (q.paymentState) {
      // computed money column: filtered in SQL through ids
      const ids = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM bookings WHERE status <> 'CANCELLED' AND CASE
          WHEN paid_amount - refunded_amount <= 0 THEN 'UNPAID'
          WHEN total_amount - (paid_amount - refunded_amount) <= 0 THEN 'PAID'
          ELSE 'PARTIAL' END = ${q.paymentState}`;
      (where.AND as Prisma.BookingWhereInput[]).push({
        id: { in: ids.map((r) => r.id) },
      });
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: bookingListInclude,
        orderBy: orderArgs(
          q,
          ['createdAt', 'totalAmount', 'bookingNo'] as const,
          'createdAt',
        ),
        ...pageArgs(q),
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginate(
      rows.map((b) => ({
        ...b,
        ...money(b),
        targetTitle: b.trip?.title ?? b.program?.title ?? b.offer?.title ?? '',
      })),
      total,
      q,
    );
  }

  async get(user: AuthUser, id: string) {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: detailInclude,
    });
    assertBranchRecord(user, b, 'Booking');
    const breakdown = user.permissions.includes('pricing.view_breakdown');
    const product = await this.loadProduct(this.prisma, b, user, true);
    const settings = await this.prisma.siteSetting.findUnique({
      where: { id: 1 },
    });
    const documents = await this.checkAll(
      this.prisma,
      b.passengers.map((p) => ({
        customerId: p.customerId,
        documentId: p.documentId ?? undefined,
      })),
      product,
      settings?.passportValidityMonths ?? 6,
    );
    return {
      ...b,
      costPerPerson: breakdown ? b.costPerPerson : undefined,
      ...money(b),
      documentCheck: documents,
      confirmRequiresPayment: settings?.confirmRequiresPayment ?? true,
    };
  }

  // ------------------------------------------------------------------ create (BKG-01..08)

  async create(user: AuthUser, dto: CreateBookingDto) {
    await this.lifecycle.runDue(true);
    const targets = [dto.tripId, dto.programId, dto.offerId].filter(Boolean);
    if (targets.length !== 1)
      throw new BadRequestException(
        'Book exactly one trip, program or offer (BKG-02)',
      );
    this.assertUniquePassengers(dto.passengers);
    if (dto.overrideDeadline && !isAll(user))
      throw new ForbiddenException(
        'Only the Admin accepts bookings after the deadline',
      );

    const settings = await this.prisma.siteSetting.findUniqueOrThrow({
      where: { id: 1 },
    });
    const result = await this.prisma.$transaction(async (tx) => {
      const product = await this.loadProduct(tx, dto, user);
      this.assertBookable(product, !!dto.overrideDeadline);
      const branchId = product.branchId ?? writeBranchFor(user, dto.branchId);

      await this.assertCustomersInScope(user, [
        dto.payerCustomerId,
        ...dto.passengers.map((p) => p.customerId),
      ]);
      await this.assertNotAlreadyBooked(
        tx,
        product,
        dto.passengers.map((p) => p.customerId),
      );

      const pickup = dto.pickupPointId
        ? product.pickupPoints.find((p) => p.id === dto.pickupPointId)
        : undefined;
      if (dto.pickupPointId && !pickup)
        throw new BadRequestException(
          'This boarding point does not belong to the booked trip',
        );

      const docs = await this.checkAll(
        tx,
        dto.passengers,
        product,
        settings.passportValidityMonths,
      );
      const pricing = await this.price(
        tx,
        product,
        dto.passengers.length,
        pickup?.surcharge,
      );

      const booking = await tx.booking.create({
        data: {
          bookingNo: await bookingNumber(tx),
          tripId: product.kind === 'TRIP' ? product.id : null,
          programId: product.kind === 'PROGRAM' ? product.id : null,
          offerId: product.kind === 'OFFER' ? product.id : null,
          payerCustomerId: dto.payerCustomerId,
          pickupPointId: pickup?.id ?? null,
          branchId,
          createdById: user.userId,
          status: 'PENDING',
          passengerCount: dto.passengers.length,
          currencyCode: product.currencyCode,
          ...pricing,
          notes: dto.notes,
          passengers: {
            create: dto.passengers.map((p, i) => ({
              customerId: p.customerId,
              documentId:
                p.documentId ??
                docs.byCustomer[p.customerId]?.documentId ??
                null,
              sortOrder: i,
            })),
          },
        },
        include: { passengers: true },
      });
      await this.syncVisas(
        tx,
        booking.passengers.map((p) => p.id),
        product.visaCountryIds,
      );
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          type: 'CREATED',
          actorId: user.userId,
          data: {
            pricePerPerson: pricing.pricePerPerson,
            total: pricing.totalAmount,
            overrideDeadline: !!dto.overrideDeadline,
          },
        },
      });
      await this.audit.log(
        user,
        {
          action: 'booking.created',
          entityType: 'booking',
          entityId: booking.id,
          summary: `${booking.bookingNo}: ${dto.passengers.length} passenger(s) on ${product.code}${dto.overrideDeadline ? ' (after the deadline, Admin override)' : ''}`,
        },
        tx,
      );
      return { booking, docs };
    });
    return {
      ...(await this.get(user, result.booking.id)),
      warnings: result.docs.problems,
    };
  }

  /** Replace passengers / boarding point while the booking holds no seat. */
  async updatePassengers(user: AuthUser, id: string, dto: UpdatePassengersDto) {
    this.assertUniquePassengers(dto.passengers);
    const settings = await this.prisma.siteSetting.findUniqueOrThrow({
      where: { id: 1 },
    });
    await this.prisma.$transaction(async (tx) => {
      const b = await this.lockBooking(tx, user, id);
      if (b.status !== 'PENDING' && b.status !== 'WAITLIST')
        throw new ConflictException(
          'Passengers change only before confirmation; cancel and rebook a confirmed booking',
        );
      const product = await this.loadProduct(tx, b, user);
      await this.assertCustomersInScope(
        user,
        dto.passengers.map((p) => p.customerId),
      );
      await this.assertNotAlreadyBooked(
        tx,
        product,
        dto.passengers.map((p) => p.customerId),
        b.id,
      );
      const pickupId =
        dto.pickupPointId === undefined ? b.pickupPointId : dto.pickupPointId;
      const pickup = pickupId
        ? product.pickupPoints.find((p) => p.id === pickupId)
        : undefined;
      if (pickupId && !pickup)
        throw new BadRequestException(
          'This boarding point does not belong to the booked trip',
        );
      const docs = await this.checkAll(
        tx,
        dto.passengers,
        product,
        settings.passportValidityMonths,
      );
      // keep the original unit price snapshot (PRC-09); only quantities and boarding change
      const surcharge = D(pickup?.surcharge ?? 0);
      const perPersonDiscount = b.passengerCount
        ? D(b.discountAmount).div(b.passengerCount)
        : D(0);
      const n = dto.passengers.length;
      const total = D(b.pricePerPerson)
        .sub(perPersonDiscount)
        .add(surcharge)
        .mul(n);
      await tx.bookingPassenger.deleteMany({ where: { bookingId: id } });
      await tx.bookingPassenger.createMany({
        data: dto.passengers.map((p, i) => ({
          bookingId: id,
          customerId: p.customerId,
          documentId:
            p.documentId ?? docs.byCustomer[p.customerId]?.documentId ?? null,
          sortOrder: i,
        })),
      });
      await tx.booking.update({
        where: { id },
        data: {
          passengerCount: n,
          pickupPointId: pickup?.id ?? null,
          surchargePerPerson: surcharge.toFixed(2),
          discountAmount: perPersonDiscount.mul(n).toFixed(2),
          totalAmount: total.toFixed(2),
        },
      });
      const passengers = await tx.bookingPassenger.findMany({
        where: { bookingId: id },
      });
      await this.syncVisas(
        tx,
        passengers.map((p) => p.id),
        product.visaCountryIds,
      );
      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          type: 'PASSENGERS_UPDATED',
          actorId: user.userId,
          data: { passengers: n },
        },
      });
      await this.audit.log(
        user,
        {
          action: 'booking.passengers_updated',
          entityType: 'booking',
          entityId: id,
          summary: `${b.bookingNo}: passengers now ${n}`,
        },
        tx,
      );
    });
    return this.get(user, id);
  }

  // ------------------------------------------------------------------ confirm / waitlist (BKG-05, BKG-07, BKG-13)

  /**
   * Takes the seats atomically. If they are gone the booking goes to the waiting list instead
   * (a PENDING booking) or stays there (a WAITLIST booking).
   */
  async confirm(user: AuthUser, id: string) {
    await this.lifecycle.runDue(true);
    const settings = await this.prisma.siteSetting.findUniqueOrThrow({
      where: { id: 1 },
    });
    try {
      await this.prisma.$transaction(async (tx) => {
        const b = await this.lockBooking(tx, user, id);
        if (b.status !== 'PENDING' && b.status !== 'WAITLIST')
          throw new ConflictException(
            `The booking is already ${b.status.toLowerCase()}`,
          );
        const product = await this.loadProduct(tx, b, user);
        if (product.status !== 'OPEN' && product.kind !== 'OFFER')
          throw new ConflictException(
            'Seats are only taken while registration is open; the Admin can reopen it',
          );
        if (product.kind === 'OFFER' && !product.bookable)
          throw new ConflictException('This offer is no longer valid');
        if (
          settings.confirmRequiresPayment &&
          D(b.paidAmount).sub(D(b.refundedAmount)).lte(0)
        )
          throw new ConflictException(
            'Record the first payment before confirming (booking rule TBD-07)',
          );
        const passengers = await tx.bookingPassenger.findMany({
          where: { bookingId: id },
        });
        const docs = await this.checkAll(
          tx,
          passengers.map((p) => ({
            customerId: p.customerId,
            documentId: p.documentId ?? undefined,
          })),
          product,
          settings.passportValidityMonths,
        );
        if (docs.problems.length)
          throw new BadRequestException([
            'Complete the travel documents before confirming (BKG-07):',
            ...docs.problems,
          ]);
        await takeSeats(tx, product.target, b.passengerCount);
        await tx.booking.update({
          where: { id },
          data: { status: 'CONFIRMED', confirmedAt: new Date() },
        });
        await tx.bookingEvent.create({
          data: {
            bookingId: id,
            type: b.status === 'WAITLIST' ? 'PROMOTED' : 'CONFIRMED',
            actorId: user.userId,
          },
        });
        await this.audit.log(
          user,
          {
            action: 'booking.confirmed',
            entityType: 'booking',
            entityId: id,
            summary: `${b.bookingNo} confirmed (${b.passengerCount} seat(s) on ${product.code})`,
          },
          tx,
        );
      });
    } catch (e) {
      if (!(e instanceof SeatsUnavailableError)) throw e;
      await this.prisma.$transaction(async (tx) => {
        const b = await this.lockBooking(tx, user, id);
        if (b.status === 'PENDING') {
          await tx.booking.update({
            where: { id },
            data: { status: 'WAITLIST' },
          });
          await tx.bookingEvent.create({
            data: { bookingId: id, type: 'WAITLISTED', actorId: user.userId },
          });
          await this.audit.log(
            user,
            {
              action: 'booking.waitlisted',
              entityType: 'booking',
              entityId: id,
              summary: `${b.bookingNo}: not enough seats, moved to the waiting list`,
            },
            tx,
          );
        }
      });
      const b = await this.get(user, id);
      return { ...b, seatsUnavailable: true };
    }
    return this.get(user, id);
  }

  /** BKG-09: cancel with a reason, give the seats back and suggest who can move up from the waitlist. */
  async cancel(user: AuthUser, id: string, reason: string) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const b = await this.lockBooking(tx, user, id);
      if (b.status === 'CANCELLED')
        throw new ConflictException('The booking is already cancelled');
      const product = await this.loadProduct(tx, b, user, true);
      if (b.status === 'CONFIRMED')
        await releaseSeats(tx, product.target, b.passengerCount);
      await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });
      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          type: 'CANCELLED',
          actorId: user.userId,
          data: { reason, previousStatus: b.status },
        },
      });
      await this.audit.log(
        user,
        {
          action: 'booking.cancelled',
          entityType: 'booking',
          entityId: id,
          summary: `${b.bookingNo} cancelled: ${reason}`,
        },
        tx,
      );
      return { b, product };
    });
    const freed = outcome.b.status === 'CONFIRMED';
    const suggestions = freed
      ? await this.waitlistSuggestions(outcome.product)
      : [];
    return { ...(await this.get(user, id)), waitlistSuggestions: suggestions };
  }

  /** BKG-11: move a trip booking to another open trip, with a new price snapshot. */
  async transfer(user: AuthUser, id: string, dto: TransferBookingDto) {
    await this.prisma
      .$transaction(async (tx) => {
        const b = await this.lockBooking(tx, user, id);
        if (!b.tripId)
          throw new BadRequestException(
            'Only trip bookings can be transferred',
          );
        if (b.status === 'CANCELLED')
          throw new ConflictException(
            'A cancelled booking cannot be transferred',
          );
        if (dto.toTripId === b.tripId)
          throw new BadRequestException('Choose another trip');
        const from = await this.loadProduct(tx, b, user, true);
        const to = await this.loadProduct(tx, { tripId: dto.toTripId }, user);
        this.assertBookable(to, false);
        if (to.currencyCode !== b.currencyCode)
          throw new BadRequestException(
            'The new trip uses another currency; cancel and rebook instead',
          );
        const passengers = await tx.bookingPassenger.findMany({
          where: { bookingId: id },
        });
        await this.assertNotAlreadyBooked(
          tx,
          to,
          passengers.map((p) => p.customerId),
        );
        if (b.status === 'CONFIRMED') {
          await releaseSeats(tx, from.target, b.passengerCount);
          await takeSeats(tx, to.target, b.passengerCount); // throws → nothing changes
        }
        const pricing = await this.price(tx, to, b.passengerCount, undefined);
        await tx.booking.update({
          where: { id },
          data: { tripId: to.id, pickupPointId: null, ...pricing },
        });
        await this.syncVisas(
          tx,
          passengers.map((p) => p.id),
          to.visaCountryIds,
        );
        await tx.bookingEvent.create({
          data: {
            bookingId: id,
            type: 'TRANSFERRED',
            actorId: user.userId,
            data: {
              fromTrip: from.code,
              toTrip: to.code,
              oldTotal: b.totalAmount.toString(),
              newTotal: pricing.totalAmount,
              note: dto.note ?? null,
            },
          },
        });
        await this.audit.log(
          user,
          {
            action: 'booking.transferred',
            entityType: 'booking',
            entityId: id,
            summary: `${b.bookingNo} moved from ${from.code} to ${to.code}`,
          },
          tx,
        );
      })
      .catch((e: unknown) => {
        if (e instanceof SeatsUnavailableError)
          throw new ConflictException(
            'The new trip does not have enough seats',
          );
        throw e;
      });
    return this.get(user, id);
  }

  // ------------------------------------------------------------------ internals

  private async waitlistSuggestions(product: Product) {
    const where: Prisma.BookingWhereInput = {
      status: 'WAITLIST',
      ...(product.kind === 'TRIP'
        ? { tripId: product.id }
        : product.kind === 'PROGRAM'
          ? { programId: product.id }
          : { offerId: product.id }),
    };
    const [queue, available] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          bookingNo: true,
          passengerCount: true,
          payer: { select: { fullName: true } },
        },
      }),
      this.seatsLeft(product),
    ]);
    return queue
      .filter((q) => available === null || q.passengerCount <= available)
      .slice(0, 5);
  }

  private async seatsLeft(product: Product): Promise<number | null> {
    if (product.kind === 'TRIP') {
      const t = await this.prisma.trip.findUniqueOrThrow({
        where: { id: product.id },
      });
      return t.maxPassengers - t.confirmedSeats;
    }
    if (product.kind === 'PROGRAM') {
      const p = await this.prisma.program.findUniqueOrThrow({
        where: { id: product.id },
        include: { legs: { include: { trip: true } } },
      });
      return Math.min(
        p.maxPassengers - p.confirmedSeats,
        ...p.legs.map((l) => l.trip.maxPassengers - l.trip.confirmedSeats),
      );
    }
    const o = await this.prisma.offer.findUniqueOrThrow({
      where: { id: product.id },
    });
    return o.maxSeats === null ? null : o.maxSeats - o.confirmedSeats;
  }

  /** Row-locks the booking so concurrent confirm/cancel/payment on it run one after another. */
  private async lockBooking(tx: Tx, user: AuthUser, id: string) {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${id}::uuid FOR UPDATE`;
    const b = await tx.booking.findUnique({ where: { id } });
    assertBranchRecord(user, b, 'Booking');
    return b;
  }

  /** PRC-09: price snapshot with the best live discount (OFR-03) and the boarding surcharge (BR-15). */
  private async price(
    tx: Tx,
    product: Product,
    passengers: number,
    surcharge?: Prisma.Decimal,
  ) {
    let discountOfferId: string | null = null;
    let discountTitle: string | null = null;
    let perPersonDiscount = D(0);
    if (product.kind !== 'OFFER') {
      const offers = await tx.offer.findMany({
        where: {
          kind: 'DISCOUNT',
          isActive: true,
          targets: {
            some:
              product.kind === 'TRIP'
                ? { tripId: product.id }
                : { programId: product.id },
          },
        },
      });
      const best = bestDiscount(product.pricePerPerson, offers);
      if (best) {
        discountOfferId = best.offer.id;
        discountTitle = best.offer.title;
        perPersonDiscount = best.amount;
      }
    }
    const s = D(surcharge ?? 0);
    const total = D(product.pricePerPerson)
      .sub(perPersonDiscount)
      .add(s)
      .mul(passengers);
    return {
      pricePerPerson: toMoney(product.pricePerPerson),
      costPerPerson: toMoney(product.costPerPerson),
      surchargePerPerson: s.toFixed(2),
      discountOfferId,
      discountTitle,
      discountAmount: perPersonDiscount.mul(passengers).toFixed(2),
      totalAmount: total.toFixed(2),
    };
  }

  private assertBookable(p: Product, override: boolean) {
    if (p.kind === 'OFFER') {
      if (!p.bookable)
        throw new ConflictException(
          'This offer is not valid today or is deactivated',
        );
      return;
    }
    if (p.status !== 'OPEN')
      throw new ConflictException(
        `Registration is not open (${p.status}); only open trips and programs take bookings (BKG-06)`,
      );
    if (p.deadline && p.deadline <= new Date() && !override)
      throw new ConflictException(
        'The registration deadline has passed (BKG-06)',
      );
    if (D(p.pricePerPerson).lte(0))
      throw new ConflictException('This trip has no price yet');
  }

  private assertUniquePassengers(passengers: PassengerDto[]) {
    if (new Set(passengers.map((p) => p.customerId)).size !== passengers.length)
      throw new BadRequestException('The same customer is listed twice');
  }

  private async assertCustomersInScope(user: AuthUser, ids: string[]) {
    const unique = [...new Set(ids)];
    const found = await this.prisma.customer.count({
      where: {
        AND: [
          { id: { in: unique } },
          { isActive: true },
          this.customers.scope(user),
        ],
      },
    });
    if (found !== unique.length)
      throw new NotFoundException('A customer was not found or is deactivated');
  }

  /** The same person cannot hold two active bookings on the same trip/program/offer (or on a trip via its program). */
  private async assertNotAlreadyBooked(
    tx: Tx,
    p: Product,
    customerIds: string[],
    excludeBookingId?: string,
  ) {
    const tripIds =
      p.target.kind === 'PROGRAM'
        ? p.target.legTripIds
        : p.kind === 'TRIP'
          ? [p.id]
          : [];
    const or: Prisma.BookingWhereInput[] = [];
    if (p.kind === 'OFFER') or.push({ offerId: p.id });
    if (p.kind === 'PROGRAM') or.push({ programId: p.id });
    if (tripIds.length)
      or.push(
        { tripId: { in: tripIds } },
        { program: { legs: { some: { tripId: { in: tripIds } } } } },
      );
    const clash = await tx.bookingPassenger.findFirst({
      where: {
        customerId: { in: customerIds },
        booking: {
          status: { not: 'CANCELLED' },
          OR: or,
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
      },
      include: {
        customer: { select: { fullName: true } },
        booking: { select: { bookingNo: true } },
      },
    });
    if (clash)
      throw new ConflictException(
        `${clash.customer.fullName} is already booked on this (booking ${clash.booking.bookingNo})`,
      );
  }

  /** CUS-03 for every passenger; the result says which document will be printed. */
  async checkAll(
    db: Tx | PrismaService,
    passengers: PassengerDto[],
    product: Product,
    months: number,
  ) {
    const customers = await db.customer.findMany({
      where: { id: { in: passengers.map((p) => p.customerId) } },
      include: {
        nationality: true,
        documents: { include: { issuingCountry: true } },
      },
    });
    const byCustomer: Record<string, DocCheck> = {};
    const problems: string[] = [];
    for (const p of passengers) {
      const c = customers.find((x) => x.id === p.customerId);
      if (!c) continue;
      const docs = c.documents.map((d) => ({
        id: d.id,
        docType: d.docType,
        expiresOn: d.expiresOn,
        issuingCountryIso: d.issuingCountry.isoCode,
      }));
      if (p.documentId && !docs.some((d) => d.id === p.documentId))
        throw new BadRequestException(
          `The chosen document does not belong to ${c.fullName}`,
        );
      const frame = {
        scope: product.scope,
        startsAt: product.startsAt ?? new Date(),
        endsAt: product.endsAt ?? product.startsAt ?? new Date(),
      };
      const check = checkDocuments(
        { nationalityIso: c.nationality.isoCode, fullName: c.fullName },
        docs,
        frame,
        months,
      );
      byCustomer[c.id] = check;
      problems.push(...check.problems);
    }
    return { ok: problems.length === 0, problems, byCustomer };
  }

  /** VIS-01: one visa record per passenger and foreign country visited. */
  private async syncVisas(
    tx: Tx,
    passengerIds: string[],
    countryIds: string[],
  ) {
    if (!countryIds.length || !passengerIds.length) return;
    await tx.visaApplication.createMany({
      data: passengerIds.flatMap((passengerId) =>
        countryIds.map((countryId) => ({ passengerId, countryId })),
      ),
      skipDuplicates: true,
    });
  }

  /** Loads the booked product with everything pricing, seats and documents need. */
  async loadProduct(
    db: Tx | PrismaService,
    ref: {
      tripId?: string | null;
      programId?: string | null;
      offerId?: string | null;
    },
    user: AuthUser,
    any = false,
  ): Promise<Product> {
    const now = new Date();
    if (ref.tripId) {
      const t = await db.trip.findFirst({
        where: {
          AND: [{ id: ref.tripId }, any ? {} : productVisibility(user)],
        },
        include: {
          pickupPoints: true,
          destinationCity: { include: { country: true } },
          lines: {
            include: {
              fromCity: { include: { country: true } },
              toCity: { include: { country: true } },
            },
          },
        },
      });
      if (!t) throw new NotFoundException('Trip not found');
      return {
        target: { kind: 'TRIP', id: t.id },
        kind: 'TRIP',
        id: t.id,
        code: t.code,
        title: t.title,
        branchId: t.branchId,
        status: t.status,
        bookable: t.status === 'OPEN' && t.registrationDeadline > now,
        deadline: t.registrationDeadline,
        scope: t.scope,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
        currencyCode: t.currencyCode,
        pricePerPerson: t.pricePerPerson.toString(),
        costPerPerson: t.costPerPerson.toString(),
        pickupPoints: t.pickupPoints,
        visaCountryIds: foreignCountries([
          t.destinationCity.country,
          ...t.lines.flatMap((l) => [l.fromCity?.country, l.toCity?.country]),
        ]),
      };
    }
    if (ref.programId) {
      const p = await db.program.findFirst({
        where: {
          AND: [{ id: ref.programId }, any ? {} : programVisibility(user)],
        },
        include: {
          legs: {
            orderBy: { sequenceNo: 'asc' },
            include: {
              trip: {
                include: {
                  pickupPoints: true,
                  destinationCity: { include: { country: true } },
                  lines: {
                    include: { toCity: { include: { country: true } } },
                  },
                },
              },
            },
          },
        },
      });
      if (!p) throw new NotFoundException('Program not found');
      const first = p.legs[0]?.trip;
      const last = p.legs.at(-1)?.trip;
      return {
        target: {
          kind: 'PROGRAM',
          id: p.id,
          legTripIds: p.legs.map((l) => l.tripId),
        },
        kind: 'PROGRAM',
        id: p.id,
        code: p.code,
        title: p.title,
        branchId: p.branchId,
        status: p.status,
        bookable: p.status === 'OPEN' && p.registrationDeadline > now,
        deadline: p.registrationDeadline,
        scope: p.scope,
        startsAt: first?.startsAt ?? null,
        endsAt: last?.endsAt ?? null,
        currencyCode: p.currencyCode,
        pricePerPerson: p.pricePerPerson.toString(),
        costPerPerson: p.costPerPerson.toString(),
        // boarding happens on the first trip (PGM-07)
        pickupPoints: first?.pickupPoints ?? [],
        visaCountryIds: foreignCountries(
          p.legs.flatMap((l) => [
            l.trip.destinationCity.country,
            ...l.trip.lines.map((x) => x.toCity?.country),
          ]),
        ),
      };
    }
    const o = await db.offer.findUnique({
      where: { id: ref.offerId! },
      include: {
        lines: {
          include: {
            item: {
              include: {
                toCity: { include: { country: true } },
                fromCity: { include: { country: true } },
              },
            },
          },
        },
      },
    });
    if (!o) throw new NotFoundException('Offer not found');
    if (o.kind !== 'BUNDLE')
      throw new BadRequestException(
        'A discount offer is applied automatically when booking its trips or programs',
      );
    const scope = foreignCountries(
      o.lines.flatMap((l) => [
        l.item.toCity?.country,
        l.item.fromCity?.country,
      ]),
    ).length
      ? 'INTERNATIONAL'
      : 'DOMESTIC';
    return {
      target: { kind: 'OFFER', id: o.id },
      kind: 'OFFER',
      id: o.id,
      code: o.title.slice(0, 24),
      title: o.title,
      branchId: null,
      status: o.isActive ? 'OPEN' : 'CLOSED',
      bookable: isOfferLive(o),
      deadline: null,
      scope,
      startsAt: o.validFrom,
      endsAt: o.validTo,
      currencyCode: o.currencyCode ?? 'SYP',
      pricePerPerson: o.pricePerPerson.toString(),
      costPerPerson: o.costPerPerson.toString(),
      pickupPoints: [],
      visaCountryIds: foreignCountries(
        o.lines.flatMap((l) => [
          l.item.toCity?.country,
          l.item.fromCity?.country,
        ]),
      ),
    };
  }
}

function foreignCountries(
  countries: ({ id: string; isoCode: string } | null | undefined)[],
  home = 'SY',
) {
  return [
    ...new Set(
      countries
        .filter(
          (c): c is { id: string; isoCode: string } =>
            !!c && c.isoCode !== home,
        )
        .map((c) => c.id),
    ),
  ];
}
