import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { paginate } from '../common/dto/pagination.dto';
import { assertBranchAccess, branchWhere, officeUser } from '../common/scope';
import { bookingReference, receiptNumber } from '../common/utils/codes';
import { D, Decimal, toMoney } from '../common/utils/money';
import { CustomersService } from '../customers/customers.module';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';
import { activeOffer, discountFor } from '../trips/pricing';
import { TripsService } from '../trips/trips.service';
import {
  BookingQueryDto,
  CancelBookingDto,
  CreateBookingDto,
  PassengerDto,
  RecordPaymentDto,
  TransferBookingDto,
  UpdateBookingDto,
} from './bookings.dto';

/** Trip statuses in which confirmations may take seats. New bookings additionally need OPEN. */
const SEATABLE = ['OPEN', 'REGISTRATION_CLOSED', 'APPROVED'] as const;

const detailInclude = {
  trip: {
    select: {
      id: true,
      code: true,
      tripType: true,
      departureDate: true,
      returnDate: true,
      status: true,
      branchId: true,
      maxSeats: true,
      confirmedSeats: true,
      tour: { select: { id: true, name: true, destination: true } },
    },
  },
  branch: { select: { id: true, name: true } },
  customer: true,
  passengers: { orderBy: { sortOrder: 'asc' } },
  payments: {
    orderBy: { paidAt: 'asc' },
    include: {
      refunds: { orderBy: { refundedAt: 'asc' } },
      recordedBy: { select: { user: { select: { fullName: true } } } },
    },
  },
  events: {
    orderBy: { createdAt: 'asc' },
    include: { actor: { select: { user: { select: { fullName: true } } } } },
  },
  externalReservations: {
    select: {
      id: true,
      kind: true,
      status: true,
      externalReference: true,
      lastError: true,
      lastSyncedAt: true,
      tripService: { select: { serviceType: true } },
    },
  },
  createdBy: { select: { user: { select: { fullName: true } } } },
} satisfies Prisma.BookingInclude;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly customers: CustomersService,
    private readonly trips: TripsService,
  ) {}

  // ------------------------------------------------------------------ queries

  async list(user: AuthUser, q: BookingQueryDto) {
    const u = officeUser(user);
    const where: Prisma.BookingWhereInput = {
      ...branchWhere(user),
      ...(q.branchId && u.scope === 'OFFICE' ? { branchId: q.branchId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.tripId ? { tripId: q.tripId } : {}),
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.search
        ? {
            OR: [
              { reference: { contains: q.search, mode: 'insensitive' } },
              {
                customer: {
                  fullName: { contains: q.search, mode: 'insensitive' },
                },
              },
              {
                customer: {
                  phone: { contains: q.search.replace(/[\s()-]/g, '') },
                },
              },
              {
                passengers: {
                  some: {
                    fullName: { contains: q.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: {
          trip: {
            select: {
              id: true,
              code: true,
              departureDate: true,
              tripType: true,
              tour: { select: { name: true } },
            },
          },
          customer: { select: { id: true, fullName: true, phone: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: q.order === 'ASC' ? 'asc' : 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginate(
      rows.map((b) => ({ ...b, balance: this.balance(b) })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async get(user: AuthUser, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, officeId: officeUser(user).officeId },
      include: detailInclude,
    });
    assertBranchAccess(user, booking, 'Booking');
    return { ...booking!, balance: this.balance(booking!) };
  }

  // ------------------------------------------------------------------ create

  /**
   * Creates a booking for a trip of the user's branch (Admins: any branch of the office).
   * Prices are taken from the trip on the server and frozen on the booking (with the active offer).
   * PENDING bookings do not take seats; `confirm: true` takes them atomically or fails/waitlists.
   */
  async create(user: AuthUser, dto: CreateBookingDto) {
    const u = officeUser(user);
    await this.trips.closeExpiredRegistrations(u.officeId);

    const id = await this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findFirst({
        where: { id: dto.tripId, officeId: u.officeId },
        include: { offers: true },
      });
      assertBranchAccess(user, trip, 'Trip'); // an employee can't book another branch's trip (404)
      if (trip!.status !== 'OPEN')
        throw new ConflictException(
          `Registration is not open for this trip (${trip!.status})`,
        );
      if (D(trip!.sellingPricePerPerson).lte(0))
        throw new ConflictException('This trip has no price yet');

      const customer = dto.customerId
        ? await tx.customer.findFirst({
            where: { id: dto.customerId, officeId: u.officeId },
          })
        : await this.findOrCreateCustomer(user, tx, dto);
      if (!customer) throw new NotFoundException('Customer not found');

      const passengers = dto.passengers.length;
      const offer = activeOffer(trip!.offers);
      const unitPrice = D(trip!.sellingPricePerPerson);
      const subtotal = unitPrice.mul(passengers);
      const discount = discountFor(offer, unitPrice, passengers);

      const booking = await tx.booking.create({
        data: {
          officeId: u.officeId,
          branchId: trip!.branchId,
          tripId: trip!.id,
          customerId: customer.id,
          reference: await this.uniqueReference(tx, u.officeId),
          status: 'PENDING',
          passengerCount: passengers,
          currencyCode: trip!.currencyCode,
          unitPrice: toMoney(unitPrice),
          unitCost: toMoney(trip!.costPerPerson),
          subtotal: toMoney(subtotal),
          offerId: offer?.id,
          offerTitle: offer?.title,
          discountType: offer?.discountType,
          discountValue: offer ? toMoney(offer.discountValue) : undefined,
          discountAmount: toMoney(discount),
          totalAmount: toMoney(subtotal.sub(discount)),
          notes: dto.notes,
          createdById: u.memberId,
          passengers: { create: this.passengerRows(dto.passengers) },
          events: {
            create: {
              type: 'CREATED',
              toTripId: trip!.id,
              actorId: u.memberId,
              data: {
                unitPrice: toMoney(unitPrice),
                discount: toMoney(discount),
                offer: offer?.title ?? null,
              },
            },
          },
        },
      });

      if (dto.confirm) {
        const ok = await this.reserveSeats(
          tx,
          trip!.id,
          u.officeId,
          passengers,
        );
        if (ok) await this.setStatus(tx, booking.id, 'CONFIRMED', u.memberId);
        else if (dto.waitlistIfFull)
          await this.setStatus(tx, booking.id, 'WAITING_LIST', u.memberId);
        else
          throw new ConflictException(
            await this.seatsMessage(tx, trip!.id, passengers),
          );
      }
      if (dto.payment)
        await this.applyPayment(user, tx, booking.id, {
          amount: dto.payment.amount,
          currencyCode: trip!.currencyCode,
          notes: dto.payment.notes,
        });

      await this.audit.log(
        user,
        {
          action: 'booking.created',
          entityType: 'booking',
          entityId: booking.id,
          summary: `Booking ${booking.reference} · ${passengers} passenger(s) on ${trip!.code}`,
        },
        tx,
      );
      return booking.id;
    });
    return this.get(user, id);
  }

  // ------------------------------------------------------------------ status transitions

  /** PENDING / WAITING_LIST → CONFIRMED, only if seats remain (atomic). */
  async confirm(user: AuthUser, id: string) {
    const u = officeUser(user);
    await this.prisma.$transaction(async (tx) => {
      const b = await this.lockBooking(user, tx, id);
      if (b.status !== 'PENDING' && b.status !== 'WAITING_LIST')
        throw new ConflictException(
          `Only pending or waiting-list bookings can be confirmed (this one is ${b.status})`,
        );
      if (
        !(await this.reserveSeats(tx, b.tripId, u.officeId, b.passengerCount))
      ) {
        throw new ConflictException(
          await this.seatsMessage(tx, b.tripId, b.passengerCount),
        );
      }
      await this.setStatus(tx, id, 'CONFIRMED', u.memberId);
      await this.audit.log(
        user,
        {
          action: 'booking.confirmed',
          entityType: 'booking',
          entityId: id,
          summary: `Confirmed ${b.reference} (${b.passengerCount} seat(s))`,
        },
        tx,
      );
    });
    return this.get(user, id);
  }

  /** PENDING → WAITING_LIST (no seats either way). */
  async waitlist(user: AuthUser, id: string) {
    const u = officeUser(user);
    await this.prisma.$transaction(async (tx) => {
      const b = await this.lockBooking(user, tx, id);
      if (b.status !== 'PENDING')
        throw new ConflictException(
          'Only pending bookings can be moved to the waiting list',
        );
      await this.setStatus(tx, id, 'WAITING_LIST', u.memberId);
    });
    return this.get(user, id);
  }

  /** Any active booking → CANCELLED. A confirmed booking releases its seats. Payments are kept. */
  async cancel(user: AuthUser, id: string, dto: CancelBookingDto) {
    const u = officeUser(user);
    await this.prisma.$transaction(async (tx) => {
      const b = await this.lockBooking(user, tx, id);
      if (b.status === 'CANCELLED')
        throw new ConflictException('Booking is already cancelled');
      if (b.status === 'CONFIRMED')
        await this.releaseSeats(tx, b.tripId, b.passengerCount);
      await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
        },
      });
      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          type: 'CANCELLED',
          actorId: u.memberId,
          data: { reason: dto.reason, previousStatus: b.status },
        },
      });
      await this.audit.log(
        user,
        {
          action: 'booking.cancelled',
          entityType: 'booking',
          entityId: id,
          summary: `Cancelled ${b.reference}${b.status === 'CONFIRMED' ? `, released ${b.passengerCount} seat(s)` : ''}`,
        },
        tx,
      );
    });
    return this.get(user, id);
  }

  async update(user: AuthUser, id: string, dto: UpdateBookingDto) {
    const u = officeUser(user);
    await this.prisma.$transaction(async (tx) => {
      const b = await this.lockBooking(user, tx, id);
      if (b.status === 'CANCELLED')
        throw new ConflictException('Cancelled bookings cannot be edited');
      const data: Prisma.BookingUpdateInput = { notes: dto.notes };

      if (dto.passengers) {
        const count = dto.passengers.length;
        if (count !== b.passengerCount) {
          if (b.status === 'CONFIRMED') {
            throw new ConflictException(
              `A confirmed booking must keep ${b.passengerCount} passenger(s). Cancel and rebook to change the group size.`,
            );
          }
          // Re-total with the ORIGINAL price and offer snapshot (historical prices never change).
          const subtotal = D(b.unitPrice).mul(count);
          const discount = b.discountType
            ? discountFor(
                {
                  id: '',
                  title: '',
                  discountType: b.discountType,
                  discountValue: b.discountValue!,
                  startsAt: new Date(0),
                  endsAt: new Date(8.64e15),
                  isActive: true,
                },
                b.unitPrice,
                count,
              )
            : D(0);
          const total = subtotal.sub(discount);
          if (total.lt(D(b.paidAmount)))
            throw new ConflictException(
              'The new total would be below what was already paid; record a refund first',
            );
          Object.assign(data, {
            passengerCount: count,
            subtotal: toMoney(subtotal),
            discountAmount: toMoney(discount),
            totalAmount: toMoney(total),
          });
        }
        await tx.bookingPassenger.deleteMany({ where: { bookingId: id } });
        await tx.bookingPassenger.createMany({
          data: this.passengerRows(dto.passengers).map((p) => ({
            ...p,
            bookingId: id,
          })),
        });
        await tx.bookingEvent.create({
          data: {
            bookingId: id,
            type: 'PASSENGERS_UPDATED',
            actorId: u.memberId,
            data: { from: b.passengerCount, to: count },
          },
        });
      }
      await tx.booking.update({ where: { id }, data });
    });
    return this.get(user, id);
  }

  /**
   * Moves a booking to another trip of the same office (and branch scope) in the same currency.
   * The booking is re-priced at the target trip's current price/offer; the previous price snapshot is
   * kept in the booking history. A confirmed booking takes seats on the target before releasing the source.
   */
  async transfer(user: AuthUser, id: string, dto: TransferBookingDto) {
    const u = officeUser(user);
    await this.trips.closeExpiredRegistrations(u.officeId);
    await this.prisma.$transaction(async (tx) => {
      const b = await this.lockBooking(user, tx, id);
      if (b.status === 'CANCELLED')
        throw new ConflictException('Cancelled bookings cannot be transferred');
      if (b.tripId === dto.targetTripId)
        throw new BadRequestException('The booking is already on this trip');

      const target = await tx.trip.findFirst({
        where: { id: dto.targetTripId, officeId: u.officeId },
        include: { offers: true },
      });
      assertBranchAccess(user, target, 'Target trip');
      if (target!.status !== 'OPEN')
        throw new ConflictException(
          'The target trip is not open for registration',
        );
      if (target!.currencyCode !== b.currencyCode) {
        throw new ConflictException(
          `The target trip is priced in ${target!.currencyCode}; this booking and its payments are in ${b.currencyCode}`,
        );
      }
      const confirmedExternal = await tx.externalReservation.count({
        where: {
          bookingId: id,
          status: { in: ['PENDING', 'CONFIRMED', 'UNKNOWN'] },
        },
      });
      if (confirmedExternal)
        throw new ConflictException(
          "Cancel this booking's hotel/transport reservations before transferring it",
        );

      const offer = activeOffer(target!.offers);
      const unitPrice = D(target!.sellingPricePerPerson);
      const subtotal = unitPrice.mul(b.passengerCount);
      const discount = discountFor(offer, unitPrice, b.passengerCount);
      const total = subtotal.sub(discount);
      if (total.lt(D(b.paidAmount)))
        throw new ConflictException(
          'The new total would be below what was already paid; record a refund first',
        );

      if (b.status === 'CONFIRMED') {
        if (
          !(await this.reserveSeats(
            tx,
            target!.id,
            u.officeId,
            b.passengerCount,
          ))
        ) {
          throw new ConflictException(
            await this.seatsMessage(tx, target!.id, b.passengerCount),
          );
        }
        await this.releaseSeats(tx, b.tripId, b.passengerCount);
      }
      await tx.booking.update({
        where: { id },
        data: {
          tripId: target!.id,
          branchId: target!.branchId,
          unitPrice: toMoney(unitPrice),
          unitCost: toMoney(target!.costPerPerson),
          subtotal: toMoney(subtotal),
          offerId: offer?.id ?? null,
          offerTitle: offer?.title ?? null,
          discountType: offer?.discountType ?? null,
          discountValue: offer ? toMoney(offer.discountValue) : null,
          discountAmount: toMoney(discount),
          totalAmount: toMoney(total),
        },
      });
      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          type: 'TRANSFERRED',
          fromTripId: b.tripId,
          toTripId: target!.id,
          actorId: u.memberId,
          data: {
            reason: dto.reason ?? null,
            previous: {
              unitPrice: toMoney(b.unitPrice),
              discount: toMoney(b.discountAmount),
              total: toMoney(b.totalAmount),
            },
            current: {
              unitPrice: toMoney(unitPrice),
              discount: toMoney(discount),
              total: toMoney(total),
            },
          },
        },
      });
      await this.audit.log(
        user,
        {
          action: 'booking.transferred',
          entityType: 'booking',
          entityId: id,
          summary: `Transferred ${b.reference} to ${target!.code}`,
        },
        tx,
      );
    });
    return this.get(user, id);
  }

  // ------------------------------------------------------------------ payments & refunds

  async recordPayment(
    user: AuthUser,
    bookingId: string,
    dto: RecordPaymentDto,
  ) {
    const paymentId = await this.prisma.$transaction(async (tx) => {
      await this.lockBooking(user, tx, bookingId);
      return this.applyPayment(user, tx, bookingId, dto);
    });
    return this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: {
        booking: {
          select: { reference: true, totalAmount: true, paidAmount: true },
        },
      },
    });
  }

  /**
   * Cash payment in the booking currency, never above the remaining balance. The paid total is
   * updated with a conditional statement so concurrent payments cannot overshoot.
   */
  private async applyPayment(
    user: AuthUser,
    tx: Tx,
    bookingId: string,
    dto: RecordPaymentDto,
  ) {
    const u = officeUser(user);
    const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (b.status === 'CANCELLED')
      throw new ConflictException(
        'Payments cannot be recorded on a cancelled booking',
      );
    if (dto.currencyCode.toUpperCase() !== b.currencyCode) {
      throw new BadRequestException(
        `This booking is in ${b.currencyCode}; payments must use the same currency`,
      );
    }
    const amount = D(dto.amount);
    if (amount.lte(0))
      throw new BadRequestException('Amount must be greater than zero');
    const updated = await tx.$executeRaw`
      UPDATE bookings SET paid_amount = paid_amount + ${toMoney(amount)}::numeric, updated_at = now()
      WHERE id = ${bookingId}::uuid AND paid_amount + ${toMoney(amount)}::numeric <= total_amount`;
    if (updated !== 1) {
      throw new BadRequestException(
        `Payment exceeds the remaining balance of ${toMoney(D(b.totalAmount).sub(D(b.paidAmount)))} ${b.currencyCode}`,
      );
    }
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    if (paidAt.getTime() > Date.now() + 60_000)
      throw new BadRequestException('Payment date cannot be in the future');

    const payment = await tx.payment.create({
      data: {
        officeId: u.officeId,
        branchId: b.branchId,
        bookingId,
        amount: toMoney(amount),
        currencyCode: b.currencyCode,
        method: 'CASH',
        receiptNumber: await this.uniqueReceipt(tx, u.officeId),
        paidAt,
        notes: dto.notes,
        recordedById: u.memberId,
      },
    });
    await this.audit.log(
      user,
      {
        action: 'payment.recorded',
        entityType: 'booking',
        entityId: bookingId,
        summary: `Cash payment ${toMoney(amount)} ${b.currencyCode} on ${b.reference} (receipt ${payment.receiptNumber})`,
      },
      tx,
    );
    return payment.id;
  }

  /** Refund linked to its original payment; never above what remains refundable on that payment. */
  async recordRefund(
    user: AuthUser,
    paymentId: string,
    amountStr: string,
    reason: string,
  ) {
    const u = officeUser(user);
    const amount = D(amountStr);
    if (amount.lte(0))
      throw new BadRequestException('Amount must be greater than zero');
    const refundId = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, officeId: u.officeId },
      });
      assertBranchAccess(user, payment, 'Payment');
      const ok = await tx.$executeRaw`
        UPDATE payments SET refunded_amount = refunded_amount + ${toMoney(amount)}::numeric
        WHERE id = ${paymentId}::uuid AND refunded_amount + ${toMoney(amount)}::numeric <= amount`;
      if (ok !== 1) {
        throw new BadRequestException(
          `Refund exceeds the refundable amount of this payment (${toMoney(D(payment!.amount).sub(D(payment!.refundedAmount)))} ${payment!.currencyCode})`,
        );
      }
      await tx.$executeRaw`
        UPDATE bookings SET paid_amount = paid_amount - ${toMoney(amount)}::numeric,
                            refunded_amount = refunded_amount + ${toMoney(amount)}::numeric, updated_at = now()
        WHERE id = ${payment!.bookingId}::uuid`;
      const refund = await tx.refund.create({
        data: {
          officeId: u.officeId,
          paymentId,
          bookingId: payment!.bookingId,
          amount: toMoney(amount),
          currencyCode: payment!.currencyCode,
          reason,
          refundedAt: new Date(),
          recordedById: u.memberId,
        },
      });
      await this.audit.log(
        user,
        {
          action: 'refund.recorded',
          entityType: 'booking',
          entityId: payment!.bookingId,
          summary: `Refund ${toMoney(amount)} ${payment!.currencyCode} of receipt ${payment!.receiptNumber}`,
          metadata: { reason },
        },
        tx,
      );
      return refund.id;
    });
    return this.prisma.refund.findUniqueOrThrow({
      where: { id: refundId },
      include: {
        payment: {
          select: { receiptNumber: true, amount: true, refundedAmount: true },
        },
      },
    });
  }

  // ------------------------------------------------------------------ seats (atomic)

  /** Takes seats only if they fit; InnoDB/PG row locking serialises concurrent confirmations. */
  private async reserveSeats(
    tx: Tx,
    tripId: string,
    officeId: string,
    seats: number,
  ) {
    const rows = await tx.$executeRaw`
      UPDATE trips SET confirmed_seats = confirmed_seats + ${seats}, updated_at = now()
      WHERE id = ${tripId}::uuid AND office_id = ${officeId}::uuid
        AND status IN ('OPEN', 'REGISTRATION_CLOSED', 'APPROVED')
        AND confirmed_seats + ${seats} <= max_seats`;
    return rows === 1;
  }

  private async releaseSeats(tx: Tx, tripId: string, seats: number) {
    await tx.$executeRaw`
      UPDATE trips SET confirmed_seats = GREATEST(confirmed_seats - ${seats}, 0), updated_at = now()
      WHERE id = ${tripId}::uuid`;
  }

  private async seatsMessage(tx: Tx, tripId: string, requested: number) {
    const t = await tx.trip.findUniqueOrThrow({ where: { id: tripId } });
    if (!SEATABLE.includes(t.status as (typeof SEATABLE)[number]))
      return `This trip cannot take confirmations (${t.status})`;
    const left = t.maxSeats - t.confirmedSeats;
    return left <= 0
      ? 'This trip is fully booked.'
      : `Only ${left} seat${left === 1 ? '' : 's'} left on this trip; this booking needs ${requested}.`;
  }

  // ------------------------------------------------------------------ helpers

  /** Row-locks the booking (SELECT ... FOR UPDATE) after checking office/branch access. */
  private async lockBooking(user: AuthUser, tx: Tx, id: string) {
    const u = officeUser(user);
    const locked = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM bookings WHERE id = ${id}::uuid AND office_id = ${u.officeId}::uuid FOR UPDATE`;
    const b = locked.length
      ? await tx.booking.findUnique({ where: { id } })
      : null;
    assertBranchAccess(user, b, 'Booking');
    return b!;
  }

  private async setStatus(
    tx: Tx,
    id: string,
    status: 'CONFIRMED' | 'WAITING_LIST',
    actorId: string,
  ) {
    await tx.booking.update({
      where: { id },
      data: {
        status,
        confirmedAt: status === 'CONFIRMED' ? new Date() : undefined,
      },
    });
    await tx.bookingEvent.create({
      data: {
        bookingId: id,
        type: status === 'CONFIRMED' ? 'CONFIRMED' : 'WAITLISTED',
        actorId,
      },
    });
  }

  private async findOrCreateCustomer(
    user: AuthUser,
    tx: Tx,
    dto: CreateBookingDto,
  ) {
    const { officeId } = officeUser(user);
    const phone = dto.customer!.phone.replace(/[\s()-]/g, '');
    const existing = await tx.customer.findUnique({
      where: { officeId_phone: { officeId, phone } },
    });
    return existing ?? this.customers.create(user, dto.customer!, tx);
  }

  private passengerRows(passengers: PassengerDto[]) {
    return passengers.map((p, i) => ({
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth
        ? new Date(`${p.dateOfBirth}T00:00:00Z`)
        : undefined,
      nationality: p.nationality,
      documentType: p.documentType ?? 'NATIONAL_ID',
      documentNumber: p.documentNumber,
      notes: p.notes,
      sortOrder: i,
    }));
  }

  private async uniqueReference(tx: Tx, officeId: string) {
    for (;;) {
      const reference = bookingReference();
      if (
        !(await tx.booking.findUnique({
          where: { officeId_reference: { officeId, reference } },
        }))
      )
        return reference;
    }
  }

  private async uniqueReceipt(tx: Tx, officeId: string) {
    for (;;) {
      const receipt = receiptNumber();
      if (
        !(await tx.payment.findUnique({
          where: {
            officeId_receiptNumber: { officeId, receiptNumber: receipt },
          },
        }))
      )
        return receipt;
    }
  }

  private balance(b: {
    status: string;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
  }) {
    return b.status === 'CANCELLED'
      ? '0.00'
      : toMoney(Decimal.max(D(b.totalAmount).sub(D(b.paidAmount)), 0));
  }
}
