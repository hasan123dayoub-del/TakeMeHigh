import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { BookingSource, PaymentStatus } from '@travelos/shared';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth.types';
import { likeTerm, paginate } from '../../common/dto/pagination.dto';
import { Decimal, toMoney } from '../../common/utils/money';
import { lockOwned } from '../../common/utils/tenant';
import { ActivityService } from '../activity/activity.service';
import { AgencySettings } from '../agencies/entities/agency-settings.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { CreateCustomerDto } from '../customers/dto/customer.dto';
import { Customer } from '../customers/entities/customer.entity';
import { Payment } from '../finance/entities/payment.entity';
import { Refund } from '../finance/entities/refund.entity';
import { Trip } from '../trips/entities/trip.entity';
import { effectiveAdultPrice } from '../trips/pricing';
import { bookingReference } from './booking-reference';
import {
  BookingQueryDto,
  CancelBookingDto,
  CreateBookingDto,
  PassengerDto,
  PaymentInputDto,
  RefundDto,
  UpdateBookingDto,
} from './dto/booking.dto';
import { BookingPassenger } from './entities/booking-passenger.entity';
import { Booking } from './entities/booking.entity';

/** Actor performing a booking action: a staff user, or the public page (no user). */
export interface BookingActor {
  agencyId: string;
  userId: string | null;
}

interface ResultHeader {
  affectedRows: number;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectDataSource() private readonly db: DataSource,
    private readonly activity: ActivityService,
  ) {}

  // ------------------------------------------------------------------ queries

  async list(agencyId: string, q: BookingQueryDto) {
    const qb = this.bookings
      .createQueryBuilder('b')
      .innerJoin('b.trip', 't')
      .innerJoin('b.customer', 'c')
      .addSelect(['t.id', 't.code', 't.title', 't.departureDate', 't.returnDate'])
      .addSelect(['c.id', 'c.firstName', 'c.lastName', 'c.phone', 'c.email'])
      .where('b.agencyId = :agencyId', { agencyId });

    if (q.status) qb.andWhere('b.status = :status', { status: q.status });
    if (q.paymentStatus) qb.andWhere('b.paymentStatus = :ps', { ps: q.paymentStatus });
    if (q.tripId) qb.andWhere('b.tripId = :tripId', { tripId: q.tripId });
    if (q.customerId) qb.andWhere('b.customerId = :customerId', { customerId: q.customerId });
    if (q.source) qb.andWhere('b.source = :source', { source: q.source });
    if (q.search) {
      qb.andWhere(
        "(b.reference LIKE :s OR CONCAT(c.firstName, ' ', c.lastName) LIKE :s OR c.phone LIKE :s OR t.title LIKE :s)",
        { s: likeTerm(q.search) },
      );
    }

    const [rows, total] = await qb
      .orderBy('b.createdAt', q.order)
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();

    return paginate(rows.map((b) => this.present(b)), total, q.page, q.pageSize);
  }

  async findOne(agencyId: string, id: string) {
    const booking = await this.bookings.findOne({
      where: { id, agencyId },
      relations: { trip: { destination: true }, customer: true, passengers: true, createdBy: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const [payments, refunds] = await Promise.all([
      this.db.getRepository(Payment).find({
        where: { bookingId: id, agencyId },
        relations: { receivedBy: true },
        order: { paidAt: 'ASC' },
      }),
      this.db.getRepository(Refund).find({
        where: { bookingId: id, agencyId },
        relations: { processedBy: true },
        order: { refundedAt: 'ASC' },
      }),
    ]);

    const { createdBy, customer, ...rest } = booking;
    return {
      ...this.present({ ...rest, customer } as Booking),
      customer: customer
        ? { ...customer, passportNumber: customer.passportNumber ? `••••${customer.passportNumber.slice(-4)}` : null }
        : null,
      createdBy: createdBy ? { id: createdBy.id, fullName: createdBy.fullName } : null,
      payments: payments.map(({ receivedBy, ...p }) => ({
        ...p,
        receivedBy: receivedBy ? { id: receivedBy.id, fullName: receivedBy.fullName } : null,
      })),
      refunds: refunds.map(({ processedBy, ...r }) => ({
        ...r,
        processedBy: processedBy ? { id: processedBy.id, fullName: processedBy.fullName } : null,
      })),
    };
  }

  /** Everything needed to render / print a booking confirmation document. */
  async confirmation(agencyId: string, id: string) {
    const booking = await this.findOne(agencyId, id);
    const agency = await this.db.getRepository(Agency).findOneByOrFail({ id: agencyId });
    const settings = await this.db.getRepository(AgencySettings).findOneBy({ agencyId });
    return {
      document: {
        title: booking.status === 'PENDING' ? 'Booking request' : 'Booking confirmation',
        number: booking.reference,
        issuedAt: new Date().toISOString(),
      },
      agency: {
        name: agency.name,
        email: agency.email,
        phone: agency.phone,
        address: [agency.address, agency.city, agency.country].filter(Boolean).join(', '),
        licenseNumber: agency.licenseNumber,
        currency: agency.currency,
        logoUrl: agency.logoUrl,
        brandColor: settings?.brandColor ?? null,
      },
      booking,
      terms: settings?.bookingTerms ?? null,
    };
  }

  // ---------------------------------------------------------------- commands

  /**
   * Creates a booking and reserves its seats atomically.
   * Seats are taken with one conditional UPDATE (`seats_booked + n <= capacity`). InnoDB row
   * locking serialises concurrent attempts on the same trip, so the last seat can only be sold once;
   * the chk_trips_seats CHECK constraint is a second safety net at the database level.
   */
  async create(actor: BookingActor, dto: CreateBookingDto, source: BookingSource = dto.source ?? 'OFFICE') {
    const children = dto.children ?? 0;
    const seats = dto.adults + children;

    if (dto.passengers && dto.passengers.length > seats) {
      throw new BadRequestException(`There are ${dto.passengers.length} passengers but only ${seats} seats`);
    }

    const bookingId = await this.db.transaction(async (m) => {
      const trip = await m.findOne(Trip, { where: { id: dto.tripId, agencyId: actor.agencyId } });
      if (!trip) throw new NotFoundException('Trip not found');
      if (trip.status !== 'PUBLISHED' && trip.status !== 'FULL') {
        throw new ConflictException(`This trip is ${trip.status.toLowerCase()} and cannot take bookings`);
      }
      if (trip.departureDate < new Date().toISOString().slice(0, 10)) {
        throw new ConflictException('This trip has already departed');
      }
      await this.reserveSeats(m, actor.agencyId, trip, seats);

      const customer = await this.resolveCustomer(m, actor, dto.customerId, dto.customer);

      // Prices always come from the trip on the server (including any active offer), never from the client.
      const unit = new Decimal(effectiveAdultPrice(trip));
      const childUnit = new Decimal(trip.childPrice ?? trip.pricePerPerson);
      const subtotal = unit.mul(dto.adults).add(childUnit.mul(children));
      const discount = new Decimal(dto.discount ?? 0);
      if (discount.gt(subtotal)) throw new BadRequestException('Discount cannot exceed the booking subtotal');
      const total = subtotal.sub(discount);

      const booking = await m.save(
        m.create(Booking, {
          agencyId: actor.agencyId,
          reference: bookingReference(),
          tripId: trip.id,
          customerId: customer.id,
          status: dto.confirm ? 'CONFIRMED' : 'PENDING',
          source,
          adults: dto.adults,
          children,
          seats,
          unitPrice: toMoney(unit),
          childUnitPrice: toMoney(childUnit),
          subtotal: toMoney(subtotal),
          discount: toMoney(discount),
          totalAmount: toMoney(total),
          paidAmount: '0.00',
          refundedAmount: '0.00',
          paymentStatus: 'UNPAID',
          notes: dto.notes ?? null,
          specialRequests: dto.specialRequests ?? null,
          confirmedAt: dto.confirm ? new Date() : null,
          createdById: actor.userId,
        }),
      );

      await this.savePassengers(m, actor.agencyId, booking, customer, dto.adults, dto.passengers);

      await this.activity.log(
        {
          agencyId: actor.agencyId,
          userId: actor.userId,
          action: source === 'PUBLIC_PAGE' ? 'booking.requested' : 'booking.created',
          entityType: 'booking',
          entityId: booking.id,
          summary: `${source === 'PUBLIC_PAGE' ? 'Online request' : 'New booking'} ${booking.reference} · ${seats} seat(s) on ${trip.title}`,
          metadata: { tripId: trip.id, seats, total: toMoney(total) },
        },
        m,
      );

      if (dto.payment) await this.applyPayment(m, actor, booking.id, dto.payment);
      return booking.id;
    });

    return this.findOne(actor.agencyId, bookingId);
  }

  async update(user: AuthUser, id: string, dto: UpdateBookingDto) {
    await this.db.transaction(async (m) => {
      const booking = await lockOwned(m, Booking, id, user.agencyId, 'Booking');
      if (dto.passengers) {
        if (dto.passengers.length !== booking.seats) {
          throw new BadRequestException(`Provide exactly ${booking.seats} passengers for this booking`);
        }
        await m.delete(BookingPassenger, { bookingId: id, agencyId: user.agencyId });
        await m.save(
          dto.passengers.map((p) =>
            m.create(BookingPassenger, { ...p, type: p.type ?? 'ADULT', agencyId: user.agencyId, bookingId: id }),
          ),
        );
      }
      await m.update(
        Booking,
        { id, agencyId: user.agencyId },
        {
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.specialRequests !== undefined ? { specialRequests: dto.specialRequests } : {}),
        },
      );
    });
    return this.findOne(user.agencyId, id);
  }

  async confirm(user: AuthUser, id: string) {
    await this.db.transaction(async (m) => {
      const booking = await lockOwned(m, Booking, id, user.agencyId, 'Booking');
      if (booking.status !== 'PENDING') {
        throw new ConflictException(`Only pending bookings can be confirmed (this one is ${booking.status.toLowerCase()})`);
      }
      await m.update(Booking, { id }, { status: 'CONFIRMED', confirmedAt: new Date() });
      await this.activity.log(
        {
          agencyId: user.agencyId,
          userId: user.userId,
          action: 'booking.confirmed',
          entityType: 'booking',
          entityId: id,
          summary: `Confirmed booking ${booking.reference}`,
        },
        m,
      );
    });
    return this.findOne(user.agencyId, id);
  }

  /** Cancels, releases the seats back to the trip and optionally refunds, all in one transaction. */
  async cancel(user: AuthUser, id: string, dto: CancelBookingDto) {
    await this.db.transaction(async (m) => {
      const booking = await lockOwned(m, Booking, id, user.agencyId, 'Booking');
      if (booking.status === 'CANCELLED') throw new ConflictException('Booking is already cancelled');
      if (booking.status === 'COMPLETED') throw new ConflictException('Completed bookings cannot be cancelled');

      await this.releaseSeats(m, user.agencyId, booking.tripId, booking.seats);
      await m.update(
        Booking,
        { id },
        { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: dto.reason },
      );

      if (dto.refund) {
        await this.applyRefund(m, user, id, { ...dto.refund, reason: `Cancellation: ${dto.reason}` });
      } else {
        await this.refreshPaymentStatus(m, id);
      }

      await this.activity.log(
        {
          agencyId: user.agencyId,
          userId: user.userId,
          action: 'booking.cancelled',
          entityType: 'booking',
          entityId: id,
          summary: `Cancelled booking ${booking.reference} · ${booking.seats} seat(s) released`,
          metadata: { reason: dto.reason, refund: dto.refund?.amount ?? null },
        },
        m,
      );
    });
    return this.findOne(user.agencyId, id);
  }

  async addPayment(user: AuthUser, id: string, dto: PaymentInputDto) {
    await this.db.transaction((m) => this.applyPayment(m, { agencyId: user.agencyId, userId: user.userId }, id, dto));
    return this.findOne(user.agencyId, id);
  }

  async addRefund(user: AuthUser, id: string, dto: RefundDto) {
    await this.db.transaction((m) => this.applyRefund(m, user, id, dto));
    return this.findOne(user.agencyId, id);
  }

  // ---------------------------------------------------------------- internals

  private async reserveSeats(m: EntityManager, agencyId: string, trip: Trip, seats: number) {
    // MySQL/MariaDB evaluate SET left to right, so `status` sees the incremented seats_booked.
    const res = (await m.query(
      `UPDATE trips
          SET seats_booked = seats_booked + ?,
              status = IF(seats_booked >= capacity, 'FULL', status),
              updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ? AND agency_id = ? AND status = 'PUBLISHED' AND seats_booked + ? <= capacity`,
      [seats, trip.id, agencyId, seats],
    )) as ResultHeader;

    if (res.affectedRows !== 1) {
      const fresh = await m.findOneByOrFail(Trip, { id: trip.id, agencyId });
      const left = fresh.capacity - fresh.seatsBooked;
      throw new ConflictException(
        left <= 0
          ? 'This trip is fully booked.'
          : `Only ${left} seat${left === 1 ? '' : 's'} left on this trip; you requested ${seats}.`,
      );
    }
  }

  private async releaseSeats(m: EntityManager, agencyId: string, tripId: string, seats: number) {
    await m.query(
      `UPDATE trips
          SET seats_booked = GREATEST(seats_booked - ?, 0),
              status = IF(status = 'FULL', 'PUBLISHED', status),
              updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ? AND agency_id = ?`,
      [seats, tripId, agencyId],
    );
  }

  private async resolveCustomer(
    m: EntityManager,
    actor: BookingActor,
    customerId?: string,
    input?: CreateCustomerDto,
  ): Promise<Customer> {
    if (customerId) {
      const existing = await m.findOne(Customer, { where: { id: customerId, agencyId: actor.agencyId } });
      if (!existing) throw new NotFoundException('Customer not found');
      return existing;
    }
    if (!input) throw new BadRequestException('Provide customerId or customer details');

    // Re-use the same person if they already exist (match on email, then phone) to avoid duplicates.
    const email = input.email?.toLowerCase();
    const match =
      (email && (await m.findOne(Customer, { where: { agencyId: actor.agencyId, email } }))) ||
      (input.phone && (await m.findOne(Customer, { where: { agencyId: actor.agencyId, phone: input.phone } })));
    if (match) return match;

    return m.save(m.create(Customer, { ...input, email: email ?? null, agencyId: actor.agencyId }));
  }

  private async savePassengers(
    m: EntityManager,
    agencyId: string,
    booking: Booking,
    customer: Customer,
    adults: number,
    passengers?: PassengerDto[],
  ) {
    const list: PassengerDto[] = passengers?.length
      ? [...passengers]
      : [{ fullName: `${customer.firstName} ${customer.lastName}`, type: 'ADULT', nationality: customer.nationality ?? undefined }];
    // Fill remaining seats with placeholders the agent can complete later.
    for (let i = list.length; i < booking.seats; i++) {
      list.push({ fullName: `Guest ${i + 1} of ${customer.lastName}`, type: i < adults ? 'ADULT' : 'CHILD' });
    }
    await m.save(
      list.map((p, i) =>
        m.create(BookingPassenger, {
          ...p,
          type: p.type ?? (i < adults ? 'ADULT' : 'CHILD'),
          agencyId,
          bookingId: booking.id,
        }),
      ),
    );
  }

  private async applyPayment(m: EntityManager, actor: BookingActor, bookingId: string, dto: PaymentInputDto) {
    const booking = await lockOwned(m, Booking, bookingId, actor.agencyId, 'Booking');
    if (booking.status === 'CANCELLED') throw new ConflictException('Cannot take payments on a cancelled booking');

    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Payment amount must be greater than zero');
    const balance = new Decimal(booking.totalAmount).sub(booking.paidAmount);
    if (amount.gt(balance)) {
      throw new BadRequestException(`Payment exceeds the remaining balance of ${toMoney(balance)}`);
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    if (paidAt.getTime() > Date.now() + 60_000) throw new BadRequestException('Payment date cannot be in the future');

    const isFirst = new Decimal(booking.paidAmount).isZero();
    await m.save(
      m.create(Payment, {
        agencyId: actor.agencyId,
        bookingId,
        amount: toMoney(amount),
        method: dto.method,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
        isDeposit: dto.isDeposit ?? (isFirst && amount.lt(booking.totalAmount)),
        paidAt,
        receivedById: actor.userId,
      }),
    );

    const paid = new Decimal(booking.paidAmount).add(amount);
    const updates: Partial<Booking> = { paidAmount: toMoney(paid) };

    // Agency rule: reaching the deposit percentage confirms a pending booking.
    if (booking.status === 'PENDING') {
      const settings = await m.findOne(AgencySettings, { where: { agencyId: actor.agencyId } });
      const depositPct = new Decimal(settings?.depositPercent ?? 30).div(100);
      if (paid.gte(new Decimal(booking.totalAmount).mul(depositPct))) {
        updates.status = 'CONFIRMED';
        updates.confirmedAt = new Date();
      }
    }
    await m.update(Booking, { id: bookingId }, updates);
    await this.refreshPaymentStatus(m, bookingId);

    await this.activity.log(
      {
        agencyId: actor.agencyId,
        userId: actor.userId,
        action: 'payment.recorded',
        entityType: 'booking',
        entityId: bookingId,
        summary: `Payment of ${toMoney(amount)} received for ${booking.reference}${updates.status === 'CONFIRMED' ? ' · booking confirmed' : ''}`,
        metadata: { amount: toMoney(amount), method: dto.method },
      },
      m,
    );
  }

  private async applyRefund(
    m: EntityManager,
    user: AuthUser,
    bookingId: string,
    dto: { amount: string; method: RefundDto['method']; reason: string },
  ) {
    const booking = await lockOwned(m, Booking, bookingId, user.agencyId, 'Booking');
    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Refund amount must be greater than zero');
    if (amount.gt(booking.paidAmount)) {
      throw new BadRequestException(`Refund exceeds the ${booking.paidAmount} actually paid on this booking`);
    }

    await m.save(
      m.create(Refund, {
        agencyId: user.agencyId,
        bookingId,
        amount: toMoney(amount),
        method: dto.method,
        reason: dto.reason.slice(0, 255),
        refundedAt: new Date(),
        processedById: user.userId,
      }),
    );
    await m.update(
      Booking,
      { id: bookingId },
      {
        paidAmount: toMoney(new Decimal(booking.paidAmount).sub(amount)),
        refundedAmount: toMoney(new Decimal(booking.refundedAmount).add(amount)),
      },
    );
    await this.refreshPaymentStatus(m, bookingId);
    await this.activity.log(
      {
        agencyId: user.agencyId,
        userId: user.userId,
        action: 'refund.issued',
        entityType: 'booking',
        entityId: bookingId,
        summary: `Refund of ${toMoney(amount)} issued for ${booking.reference}`,
        metadata: { amount: toMoney(amount), reason: dto.reason },
      },
      m,
    );
  }

  private async refreshPaymentStatus(m: EntityManager, bookingId: string) {
    const b = await m.findOneByOrFail(Booking, { id: bookingId });
    await m.update(Booking, { id: bookingId }, { paymentStatus: paymentStatusOf(b) });
  }

  present(b: Booking) {
    const balance =
      b.status === 'CANCELLED' ? new Decimal(0) : Decimal.max(new Decimal(b.totalAmount).sub(b.paidAmount), 0);
    return {
      ...b,
      balance: toMoney(balance),
      customer: b.customer
        ? { ...b.customer, fullName: `${b.customer.firstName} ${b.customer.lastName}` }
        : undefined,
    };
  }
}

export function paymentStatusOf(b: Pick<Booking, 'status' | 'totalAmount' | 'paidAmount' | 'refundedAmount'>): PaymentStatus {
  const paid = new Decimal(b.paidAmount);
  const refunded = new Decimal(b.refundedAmount);
  if (b.status === 'CANCELLED') return refunded.gt(0) ? 'REFUNDED' : paid.gt(0) ? 'PARTIAL' : 'UNPAID';
  if (paid.isZero()) return refunded.gt(0) ? 'REFUNDED' : 'UNPAID';
  return paid.gte(b.totalAmount) ? 'PAID' : 'PARTIAL';
}
