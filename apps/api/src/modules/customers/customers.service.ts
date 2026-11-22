import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { can } from '@travelos/shared';
import { DataSource, Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth.types';
import { likeTerm, paginate } from '../../common/dto/pagination.dto';
import { toMoney } from '../../common/utils/money';
import { findOwned } from '../../common/utils/tenant';
import { ActivityService } from '../activity/activity.service';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../finance/entities/payment.entity';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './dto/customer.dto';
import { Customer } from './entities/customer.entity';

/** "N0123456" -> "••••3456". Passport numbers never leave the API in full unless the role needs them. */
export const maskPassport = (v: string | null) => (v ? `••••${v.slice(-4)}` : null);

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectDataSource() private readonly db: DataSource,
    private readonly activity: ActivityService,
  ) {}

  async list(agencyId: string, q: CustomerQueryDto) {
    const qb = this.customers.createQueryBuilder('c').where('c.agencyId = :agencyId', { agencyId });
    if (q.search) {
      qb.andWhere(
        "(CONCAT(c.firstName, ' ', c.lastName) LIKE :s OR c.email LIKE :s OR c.phone LIKE :s)",
        { s: likeTerm(q.search) },
      );
    }
    const [rows, total] = await qb
      .orderBy('c.createdAt', q.order)
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();

    // Per-customer totals in one grouped query (no N+1).
    const ids = rows.map((r) => r.id);
    const stats = new Map<string, { bookings: number; totalSpent: string; outstanding: string; lastTrip: string | null }>();
    if (ids.length) {
      const agg: Array<Record<string, string>> = await this.db.query(
        `SELECT b.customer_id AS id, COUNT(*) AS bookings,
                COALESCE(SUM(b.paid_amount), 0) AS spent,
                COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' THEN b.total_amount - b.paid_amount ELSE 0 END), 0) AS outstanding,
                MAX(t.departure_date) AS lastTrip
         FROM bookings b JOIN trips t ON t.id = b.trip_id
         WHERE b.agency_id = ? AND b.customer_id IN (?)
         GROUP BY b.customer_id`,
        [agencyId, ids],
      );
      for (const a of agg) {
        stats.set(a.id, {
          bookings: Number(a.bookings),
          totalSpent: toMoney(a.spent),
          outstanding: toMoney(a.outstanding),
          lastTrip: a.lastTrip ?? null,
        });
      }
    }

    return paginate(
      rows.map((c) => ({
        ...this.present(c, false),
        stats: stats.get(c.id) ?? { bookings: 0, totalSpent: '0.00', outstanding: '0.00', lastTrip: null },
      })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async findOne(user: AuthUser, id: string) {
    const customer = await findOwned(this.customers, id, user.agencyId, undefined, 'Customer');
    const [bookings, payments] = await Promise.all([
      this.db.getRepository(Booking).find({
        where: { customerId: id, agencyId: user.agencyId },
        relations: { trip: true },
        order: { createdAt: 'DESC' },
        select: {
          id: true,
          reference: true,
          status: true,
          paymentStatus: true,
          seats: true,
          totalAmount: true,
          paidAmount: true,
          createdAt: true,
          trip: { id: true, code: true, title: true, departureDate: true, returnDate: true },
        },
      }),
      this.db
        .getRepository(Payment)
        .createQueryBuilder('p')
        .innerJoin('p.booking', 'b')
        .addSelect(['b.id', 'b.reference'])
        .where('p.agencyId = :agencyId AND b.customerId = :id', { agencyId: user.agencyId, id })
        .orderBy('p.paidAt', 'DESC')
        .getMany(),
    ]);

    const active = bookings.filter((b) => b.status !== 'CANCELLED');
    const total = active.reduce((s, b) => s + Number(b.totalAmount), 0);
    const paid = bookings.reduce((s, b) => s + Number(b.paidAmount), 0);
    return {
      ...this.present(customer, can(user.role, 'customers.write')),
      bookings,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        isDeposit: p.isDeposit,
        paidAt: p.paidAt,
        reference: p.reference,
        booking: { id: p.booking?.id, reference: p.booking?.reference },
      })),
      stats: {
        bookings: bookings.length,
        trips: new Set(active.map((b) => b.trip?.id)).size,
        totalBooked: toMoney(total),
        totalPaid: toMoney(paid),
        outstanding: toMoney(Math.max(0, total - active.reduce((s, b) => s + Number(b.paidAmount), 0))),
      },
    };
  }

  async create(user: AuthUser, dto: CreateCustomerDto) {
    await this.assertNoDuplicate(user.agencyId, dto.email, dto.phone);
    const customer = await this.customers.save(
      this.customers.create({ ...dto, email: dto.email?.toLowerCase() ?? null, agencyId: user.agencyId }),
    );
    await this.activity.log({
      agencyId: user.agencyId,
      userId: user.userId,
      action: 'customer.created',
      entityType: 'customer',
      entityId: customer.id,
      summary: `Added customer ${customer.firstName} ${customer.lastName}`,
    });
    return this.present(customer, true);
  }

  async update(user: AuthUser, id: string, dto: UpdateCustomerDto) {
    const customer = await findOwned(this.customers, id, user.agencyId, undefined, 'Customer');
    await this.assertNoDuplicate(user.agencyId, dto.email, dto.phone, id);
    Object.assign(customer, dto, dto.email ? { email: dto.email.toLowerCase() } : {});
    await this.customers.save(customer);
    return this.present(customer, true);
  }

  async remove(user: AuthUser, id: string) {
    const customer = await findOwned(this.customers, id, user.agencyId, undefined, 'Customer');
    const count = await this.db.getRepository(Booking).countBy({ customerId: id, agencyId: user.agencyId });
    if (count) throw new ConflictException('This customer has bookings and cannot be deleted.');
    await this.customers.delete({ id, agencyId: user.agencyId });
    await this.activity.log({
      agencyId: user.agencyId,
      userId: user.userId,
      action: 'customer.deleted',
      entityType: 'customer',
      entityId: id,
      summary: `Deleted customer ${customer.firstName} ${customer.lastName}`,
    });
    return { deleted: true };
  }

  /** Same person entered twice is the #1 data problem in paper/WhatsApp operations. */
  private async assertNoDuplicate(agencyId: string, email?: string, phone?: string, exceptId?: string) {
    for (const [field, value] of [
      ['email', email?.toLowerCase()],
      ['phone', phone],
    ] as const) {
      if (!value) continue;
      const existing = await this.customers.findOne({ where: { agencyId, [field]: value } });
      if (existing && existing.id !== exceptId) {
        throw new ConflictException(
          `A customer with this ${field} already exists: ${existing.firstName} ${existing.lastName}`,
        );
      }
    }
  }

  present(c: Customer, revealSensitive: boolean) {
    return {
      ...c,
      fullName: `${c.firstName} ${c.lastName}`,
      passportNumber: revealSensitive ? c.passportNumber : maskPassport(c.passportNumber),
    };
  }
}
