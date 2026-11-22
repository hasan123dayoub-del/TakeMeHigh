import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/auth.types';
import { branchWhere, officeUser } from '../common/scope';
import { D, toMoney } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isoDate, todayIso, toDate } from '../trips/pricing';
import { TripsService } from '../trips/trips.service';

const LIVE = ['OPEN', 'REGISTRATION_CLOSED', 'APPROVED'] as const;

/** SQL fragment restricting a table alias to the user's office (and branch for BRANCH scope). */
export function scopeSql(user: AuthUser, alias: string) {
  const u = officeUser(user);
  const a = Prisma.raw(alias);
  return u.scope === 'OFFICE'
    ? Prisma.sql`${a}.office_id = ${u.officeId}::uuid`
    : Prisma.sql`${a}.office_id = ${u.officeId}::uuid AND ${a}.branch_id = ${u.branchId}::uuid`;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  /**
   * One call for the dashboard. Money is always grouped by currency (SYP and USD are never added)
   * and revenue, collected cash, expected profit and realised profit are kept distinct.
   * Financial figures are only included for roles with `reports.financial`.
   */
  async get(user: AuthUser) {
    const u = officeUser(user);
    await this.trips.closeExpiredRegistrations(u.officeId);
    const scope = branchWhere(user);
    const today = toDate(todayIso());
    const financial = user.permissions.includes('reports.financial');

    const [upcomingTrips, awaitingDecision, bookingCounts, recentBookings] = await Promise.all([
      this.prisma.trip.findMany({
        where: { ...scope, status: { in: [...LIVE] }, departureDate: { gte: today } },
        include: { tour: { select: { name: true, destination: true } }, branch: { select: { name: true } }, _count: { select: { bookings: { where: { status: { in: ['PENDING', 'WAITING_LIST'] } } } } } },
        orderBy: { departureDate: 'asc' },
      }),
      this.prisma.trip.findMany({ where: { ...scope, status: 'REGISTRATION_CLOSED' }, select: { id: true, code: true, confirmedSeats: true, minPassengers: true, departureDate: true }, orderBy: { departureDate: 'asc' } }),
      this.prisma.booking.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.booking.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { customer: { select: { fullName: true } }, trip: { select: { code: true, tour: { select: { name: true } } } } },
      }),
    ]);

    const count = (s: string) => bookingCounts.find((b) => b.status === s)?._count._all ?? 0;
    const soon = isoDate(new Date(Date.now() + 3 * 86_400_000));

    const result = {
      kpis: {
        totalBookings: bookingCounts.filter((b) => b.status !== 'CANCELLED').reduce((n, b) => n + b._count._all, 0),
        pendingBookings: count('PENDING'),
        waitingList: count('WAITING_LIST'),
        upcomingTrips: upcomingTrips.length,
        confirmedPassengers: upcomingTrips.reduce((n, t) => n + t.confirmedSeats, 0),
        availableSeats: upcomingTrips.filter((t) => t.status === 'OPEN').reduce((n, t) => n + (t.maxSeats - t.confirmedSeats), 0),
      },
      upcomingTrips: upcomingTrips.slice(0, 8).map((t) => ({
        id: t.id,
        code: t.code,
        tour: t.tour.name,
        destination: t.tour.destination,
        branch: t.branch.name,
        tripType: t.tripType,
        status: t.status,
        departureDate: isoDate(t.departureDate),
        registrationClosesOn: isoDate(t.registrationExtendedUntil ?? t.registrationDeadline),
        confirmedSeats: t.confirmedSeats,
        maxSeats: t.maxSeats,
        minPassengers: t.minPassengers,
        occupancyPct: Math.round((t.confirmedSeats / t.maxSeats) * 100),
        waiting: t._count.bookings,
      })),
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        status: b.status,
        customer: b.customer.fullName,
        trip: `${b.trip.code} · ${b.trip.tour.name}`,
        passengers: b.passengerCount,
        total: toMoney(b.totalAmount),
        currencyCode: b.currencyCode,
        createdAt: b.createdAt,
      })),
      tasks: {
        awaitingDecision: awaitingDecision.map((t) => ({ ...t, departureDate: isoDate(t.departureDate), minimumReached: t.confirmedSeats >= t.minPassengers })),
        pendingBookings: count('PENDING'),
        waitingList: count('WAITING_LIST'),
        registrationClosingSoon: upcomingTrips
          .filter((t) => t.status === 'OPEN' && isoDate(t.registrationExtendedUntil ?? t.registrationDeadline) <= soon)
          .map((t) => ({ id: t.id, code: t.code, closesOn: isoDate(t.registrationExtendedUntil ?? t.registrationDeadline), confirmedSeats: t.confirmedSeats, minPassengers: t.minPassengers })),
      },
      finance: financial ? await this.finance(user) : null,
      recentActivity:
        u.scope === 'OFFICE'
          ? await this.prisma.auditLog.findMany({
              where: { officeId: u.officeId },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: { id: true, action: true, summary: true, createdAt: true, user: { select: { fullName: true } } },
            })
          : [],
    };
    return result;
  }

  private async finance(user: AuthUser) {
    const s = scopeSql(user, 'b');
    const sp = scopeSql(user, 'p');
    const [collected, thisMonth, outstanding, expected, realised] = await Promise.all([
      this.prisma.$queryRaw<Array<{ currency: string; amount: string }>>`
        SELECT p.currency_code AS currency, (SUM(p.amount) - SUM(p.refunded_amount))::text AS amount
        FROM payments p WHERE ${sp} GROUP BY p.currency_code`,
      this.prisma.$queryRaw<Array<{ currency: string; amount: string }>>`
        SELECT p.currency_code AS currency, (SUM(p.amount) - SUM(p.refunded_amount))::text AS amount
        FROM payments p WHERE ${sp} AND p.paid_at >= date_trunc('month', now()) GROUP BY p.currency_code`,
      // what confirmed customers still owe
      this.prisma.$queryRaw<Array<{ currency: string; amount: string }>>`
        SELECT b.currency_code AS currency, SUM(b.total_amount - b.paid_amount)::text AS amount
        FROM bookings b WHERE ${s} AND b.status = 'CONFIRMED' GROUP BY b.currency_code`,
      // expected profit of upcoming/live trips: confirmed revenue − supplier cost (booking snapshots)
      this.prisma.$queryRaw<Array<{ currency: string; revenue: string; cost: string }>>`
        SELECT b.currency_code AS currency, SUM(b.total_amount)::text AS revenue, SUM(b.unit_cost * b.passenger_count)::text AS cost
        FROM bookings b JOIN trips t ON t.id = b.trip_id
        WHERE ${s} AND b.status = 'CONFIRMED' AND t.status IN ('OPEN','REGISTRATION_CLOSED','APPROVED')
        GROUP BY b.currency_code`,
      // realised profit of completed trips: net cash collected − cash paid to suppliers
      this.prisma.$queryRaw<Array<{ currency: string; collected: string; paid_suppliers: string }>>`
        SELECT t.currency_code AS currency,
               COALESCE((SELECT SUM(p.amount - p.refunded_amount) FROM payments p JOIN bookings b ON b.id = p.booking_id
                         JOIN trips t2 ON t2.id = b.trip_id WHERE t2.currency_code = t.currency_code AND t2.status = 'COMPLETED' AND ${s}), 0)::text AS collected,
               COALESCE((SELECT SUM(sp.amount) FROM supplier_payments sp JOIN trips t3 ON t3.id = sp.trip_id
                         WHERE t3.currency_code = t.currency_code AND t3.status = 'COMPLETED' AND ${scopeSql(user, 't3')}), 0)::text AS paid_suppliers
        FROM trips t WHERE ${scopeSql(user, 't')} AND t.status = 'COMPLETED' GROUP BY t.currency_code`,
    ]);
    const money = (rows: Array<{ currency: string; amount: string }>) => rows.map((r) => ({ currencyCode: r.currency, amount: toMoney(r.amount) }));
    return {
      collectedTotal: money(collected),
      collectedThisMonth: money(thisMonth),
      outstanding: money(outstanding),
      expectedProfit: expected.map((r) => ({ currencyCode: r.currency, revenue: toMoney(r.revenue), supplierCost: toMoney(r.cost), profit: toMoney(D(r.revenue).sub(r.cost)) })),
      realisedProfit: realised.map((r) => ({ currencyCode: r.currency, collected: toMoney(r.collected), paidToSuppliers: toMoney(r.paid_suppliers), profit: toMoney(D(r.collected).sub(r.paid_suppliers)) })),
    };
  }
}
