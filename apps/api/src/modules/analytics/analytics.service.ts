import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Decimal, toMoney } from '../../common/utils/money';
import { ActivityService } from '../activity/activity.service';

type Row = Record<string, string | null>;
const n = (v: unknown) => Number(v ?? 0);

/** YYYY-MM keys for the last `count` months, oldest first (so charts never have gaps). */
function lastMonths(count: number, until = new Date()): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(until.getUTCFullYear(), until.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = to.slice(0, 7);
  while (d.toISOString().slice(0, 7) <= end && out.length < 60) {
    out.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly activity: ActivityService,
  ) {}

  /** Everything the dashboard needs in one round trip. Nothing is hard-coded. */
  async dashboard(agencyId: string) {
    const q = (sql: string, params: unknown[] = []) => this.db.query(sql, [agencyId, ...params]) as Promise<Row[]>;

    const [[kpi], upcoming, monthlyCollected, monthlyRefunds, monthlyBooked, weekly, byStatus, recent] =
      await Promise.all([
        q(
          `SELECT
            (SELECT COUNT(*) FROM trips WHERE agency_id = a.id) AS totalTrips,
            (SELECT COUNT(*) FROM trips WHERE agency_id = a.id AND status IN ('PUBLISHED','FULL','IN_PROGRESS')
               AND return_date >= CURRENT_DATE()) AS activeTrips,
            (SELECT COUNT(*) FROM bookings WHERE agency_id = a.id AND status <> 'CANCELLED') AS totalBookings,
            (SELECT COUNT(*) FROM bookings WHERE agency_id = a.id AND status = 'PENDING') AS pendingBookings,
            (SELECT COALESCE(SUM(capacity - seats_booked),0) FROM trips WHERE agency_id = a.id
               AND status = 'PUBLISHED' AND departure_date >= CURRENT_DATE()) AS availableSeats,
            (SELECT COALESCE(SUM(capacity),0) FROM trips WHERE agency_id = a.id
               AND status IN ('PUBLISHED','FULL') AND departure_date >= CURRENT_DATE()) AS upcomingCapacity,
            (SELECT COALESCE(SUM(amount),0) FROM payments WHERE agency_id = a.id) AS collected,
            (SELECT COALESCE(SUM(amount),0) FROM refunds WHERE agency_id = a.id) AS refunded,
            (SELECT COALESCE(SUM(amount),0) FROM payments WHERE agency_id = a.id
               AND paid_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')) AS collectedThisMonth,
            (SELECT COALESCE(SUM(amount),0) FROM payments WHERE agency_id = a.id
               AND paid_at >= DATE_FORMAT(CURRENT_DATE() - INTERVAL 1 MONTH, '%Y-%m-01')
               AND paid_at < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')) AS collectedLastMonth,
            (SELECT COALESCE(SUM(b.total_amount - b.paid_amount),0) FROM bookings b
               WHERE b.agency_id = a.id AND b.status <> 'CANCELLED') AS outstanding,
            (SELECT COUNT(*) FROM bookings b JOIN trips t ON t.id = b.trip_id
               LEFT JOIN agency_settings s ON s.agency_id = b.agency_id
               WHERE b.agency_id = a.id AND b.status IN ('PENDING','CONFIRMED') AND b.total_amount > b.paid_amount
               AND t.departure_date <= CURRENT_DATE() + INTERVAL COALESCE(s.balance_due_days_before_departure, 7) DAY
            ) AS overdueBookings
          FROM agencies a WHERE a.id = ?`,
        ),
        q(
          `SELECT t.id, t.code, t.title, t.departure_date AS departureDate, t.return_date AS returnDate,
                  t.capacity, t.seats_booked AS seatsBooked, t.status, d.name AS destination,
                  (SELECT COUNT(*) FROM bookings b WHERE b.trip_id = t.id AND b.status = 'PENDING') AS pendingBookings
             FROM trips t JOIN destinations d ON d.id = t.destination_id
            WHERE t.agency_id = ? AND t.status IN ('PUBLISHED','FULL') AND t.departure_date >= CURRENT_DATE()
            ORDER BY t.departure_date ASC LIMIT 6`,
        ),
        q(
          `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS m, SUM(amount) AS v FROM payments
            WHERE agency_id = ? AND paid_at >= DATE_FORMAT(CURRENT_DATE() - INTERVAL 11 MONTH, '%Y-%m-01')
            GROUP BY m`,
        ),
        q(
          `SELECT DATE_FORMAT(refunded_at, '%Y-%m') AS m, SUM(amount) AS v FROM refunds
            WHERE agency_id = ? AND refunded_at >= DATE_FORMAT(CURRENT_DATE() - INTERVAL 11 MONTH, '%Y-%m-01')
            GROUP BY m`,
        ),
        q(
          `SELECT DATE_FORMAT(created_at, '%Y-%m') AS m, SUM(total_amount) AS v, COUNT(*) AS c FROM bookings
            WHERE agency_id = ? AND status <> 'CANCELLED'
              AND created_at >= DATE_FORMAT(CURRENT_DATE() - INTERVAL 11 MONTH, '%Y-%m-01')
            GROUP BY m`,
        ),
        q(
          `SELECT DATE_FORMAT(created_at - INTERVAL WEEKDAY(created_at) DAY, '%Y-%m-%d') AS w,
                  COUNT(*) AS bookings, SUM(seats) AS seats
             FROM bookings WHERE agency_id = ? AND created_at >= CURRENT_DATE() - INTERVAL 12 WEEK
            GROUP BY w ORDER BY w`,
        ),
        q(`SELECT status, COUNT(*) AS c FROM bookings WHERE agency_id = ? GROUP BY status`),
        this.activity.recent(agencyId, 8),
      ]);

    const byMonth = (rows: Row[]) => new Map(rows.map((r) => [r.m as string, r]));
    const col = byMonth(monthlyCollected);
    const ref = byMonth(monthlyRefunds);
    const bkd = byMonth(monthlyBooked);

    const thisMonth = new Decimal(kpi.collectedThisMonth ?? 0);
    const lastMonth = new Decimal(kpi.collectedLastMonth ?? 0);

    return {
      kpis: {
        totalTrips: n(kpi.totalTrips),
        activeTrips: n(kpi.activeTrips),
        totalBookings: n(kpi.totalBookings),
        pendingBookings: n(kpi.pendingBookings),
        availableSeats: n(kpi.availableSeats),
        upcomingCapacity: n(kpi.upcomingCapacity),
        revenue: toMoney(new Decimal(kpi.collected ?? 0).sub(kpi.refunded ?? 0)),
        revenueThisMonth: toMoney(thisMonth),
        revenueLastMonth: toMoney(lastMonth),
        revenueChangePct: lastMonth.isZero() ? null : thisMonth.sub(lastMonth).div(lastMonth).mul(100).toDecimalPlaces(1).toNumber(),
        outstanding: toMoney(kpi.outstanding ?? 0),
        overdueBookings: n(kpi.overdueBookings),
      },
      upcomingDepartures: upcoming.map((t) => ({
        ...t,
        capacity: n(t.capacity),
        seatsBooked: n(t.seatsBooked),
        seatsAvailable: n(t.capacity) - n(t.seatsBooked),
        pendingBookings: n(t.pendingBookings),
      })),
      revenueByMonth: lastMonths(12).map((m) => ({
        month: m,
        collected: toMoney(new Decimal(col.get(m)?.v ?? 0).sub(ref.get(m)?.v ?? 0)),
        booked: toMoney(bkd.get(m)?.v ?? 0),
        bookings: n(bkd.get(m)?.c),
      })),
      bookingTrend: weekly.map((w) => ({ weekStart: w.w, bookings: n(w.bookings), seats: n(w.seats) })),
      bookingsByStatus: Object.fromEntries(byStatus.map((s) => [s.status, n(s.c)])),
      recentActivity: recent,
    };
  }

  /** Reports for a date range (defaults to the last 12 months). */
  async reports(agencyId: string, from?: string, to?: string) {
    const today = new Date().toISOString().slice(0, 10);
    const end = to ?? today;
    const start = from ?? `${lastMonths(12)[0]}-01`;
    const q = (sql: string, params: unknown[] = []) => this.db.query(sql, params) as Promise<Row[]>;

    const [collected, refunds, expenses, popular, utilization, outstanding, profitability, byCategory, bySource, byMethod] =
      await Promise.all([
        q(
          `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS m, SUM(amount) AS v FROM payments
            WHERE agency_id = ? AND paid_at >= ? AND paid_at < ? + INTERVAL 1 DAY GROUP BY m`,
          [agencyId, start, end],
        ),
        q(
          `SELECT DATE_FORMAT(refunded_at, '%Y-%m') AS m, SUM(amount) AS v FROM refunds
            WHERE agency_id = ? AND refunded_at >= ? AND refunded_at < ? + INTERVAL 1 DAY GROUP BY m`,
          [agencyId, start, end],
        ),
        q(
          `SELECT DATE_FORMAT(expense_date, '%Y-%m') AS m, SUM(amount) AS v FROM expenses
            WHERE agency_id = ? AND expense_date BETWEEN ? AND ? GROUP BY m`,
          [agencyId, start, end],
        ),
        q(
          `SELECT t.id, t.code, t.title, d.name AS destination, COUNT(b.id) AS bookings,
                  COALESCE(SUM(b.seats),0) AS seats, COALESCE(SUM(b.total_amount),0) AS revenue
             FROM trips t JOIN destinations d ON d.id = t.destination_id
             JOIN bookings b ON b.trip_id = t.id AND b.status <> 'CANCELLED'
            WHERE t.agency_id = ? AND b.created_at >= ? AND b.created_at < ? + INTERVAL 1 DAY
            GROUP BY t.id, t.code, t.title, d.name ORDER BY seats DESC LIMIT 8`,
          [agencyId, start, end],
        ),
        q(
          `SELECT t.id, t.code, t.title, t.departure_date AS departureDate, t.status, t.capacity,
                  t.seats_booked AS seatsBooked
             FROM trips t WHERE t.agency_id = ? AND t.status <> 'DRAFT' AND t.status <> 'CANCELLED'
              AND t.departure_date BETWEEN ? AND ? + INTERVAL 90 DAY
            ORDER BY t.departure_date`,
          [agencyId, start, end],
        ),
        q(
          `SELECT b.id, b.reference, b.status, b.total_amount AS totalAmount, b.paid_amount AS paidAmount,
                  b.total_amount - b.paid_amount AS balance,
                  CONCAT(c.first_name, ' ', c.last_name) AS customer, c.phone,
                  t.code AS tripCode, t.title AS tripTitle, t.departure_date AS departureDate,
                  DATE_SUB(t.departure_date, INTERVAL COALESCE(s.balance_due_days_before_departure, 7) DAY) AS dueDate
             FROM bookings b JOIN customers c ON c.id = b.customer_id JOIN trips t ON t.id = b.trip_id
             LEFT JOIN agency_settings s ON s.agency_id = b.agency_id
            WHERE b.agency_id = ? AND b.status <> 'CANCELLED' AND b.total_amount > b.paid_amount
            ORDER BY dueDate ASC LIMIT 100`,
          [agencyId],
        ),
        q(
          `SELECT t.id, t.code, t.title, t.departure_date AS departureDate, t.status,
                  COALESCE((SELECT SUM(total_amount) FROM bookings WHERE trip_id = t.id AND status <> 'CANCELLED'),0) AS revenue,
                  COALESCE((SELECT SUM(paid_amount) FROM bookings WHERE trip_id = t.id),0) AS collected,
                  COALESCE((SELECT SUM(total_cost) FROM trip_suppliers WHERE trip_id = t.id),0) AS supplierCost,
                  COALESCE((SELECT SUM(amount) FROM expenses WHERE trip_id = t.id),0) AS expenses
             FROM trips t WHERE t.agency_id = ? AND t.status <> 'DRAFT'
              AND t.departure_date BETWEEN ? AND ? + INTERVAL 90 DAY
            ORDER BY t.departure_date`,
          [agencyId, start, end],
        ),
        q(
          `SELECT category, SUM(amount) AS v FROM expenses WHERE agency_id = ? AND expense_date BETWEEN ? AND ?
            GROUP BY category ORDER BY v DESC`,
          [agencyId, start, end],
        ),
        q(
          `SELECT source, COUNT(*) AS c, SUM(total_amount) AS v FROM bookings
            WHERE agency_id = ? AND status <> 'CANCELLED' AND created_at >= ? AND created_at < ? + INTERVAL 1 DAY
            GROUP BY source ORDER BY c DESC`,
          [agencyId, start, end],
        ),
        q(
          `SELECT method, COUNT(*) AS c, SUM(amount) AS v FROM payments
            WHERE agency_id = ? AND paid_at >= ? AND paid_at < ? + INTERVAL 1 DAY GROUP BY method ORDER BY v DESC`,
          [agencyId, start, end],
        ),
      ]);

    const map = (rows: Row[]) => new Map(rows.map((r) => [r.m as string, r.v]));
    const c = map(collected);
    const r = map(refunds);
    const e = map(expenses);

    const revenueByPeriod = monthsBetween(start, end).map((m) => {
      const net = new Decimal(c.get(m) ?? 0).sub(r.get(m) ?? 0);
      return {
        month: m,
        collected: toMoney(c.get(m) ?? 0),
        refunds: toMoney(r.get(m) ?? 0),
        expenses: toMoney(e.get(m) ?? 0),
        net: toMoney(net),
        profit: toMoney(net.sub(e.get(m) ?? 0)),
      };
    });

    const totals = revenueByPeriod.reduce(
      (acc, p) => ({
        collected: acc.collected.add(p.collected),
        refunds: acc.refunds.add(p.refunds),
        expenses: acc.expenses.add(p.expenses),
      }),
      { collected: new Decimal(0), refunds: new Decimal(0), expenses: new Decimal(0) },
    );
    const capacity = utilization.reduce((s, t) => s + n(t.capacity), 0);
    const sold = utilization.reduce((s, t) => s + n(t.seatsBooked), 0);

    return {
      range: { from: start, to: end },
      totals: {
        collected: toMoney(totals.collected),
        refunds: toMoney(totals.refunds),
        expenses: toMoney(totals.expenses),
        net: toMoney(totals.collected.sub(totals.refunds)),
        profit: toMoney(totals.collected.sub(totals.refunds).sub(totals.expenses)),
        seatUtilizationPct: capacity ? Math.round((sold / capacity) * 1000) / 10 : 0,
        outstanding: toMoney(outstanding.reduce((s, b) => s.add(b.balance ?? 0), new Decimal(0))),
      },
      revenueByPeriod,
      popularTrips: popular.map((p) => ({ ...p, bookings: n(p.bookings), seats: n(p.seats), revenue: toMoney(p.revenue ?? 0) })),
      seatUtilization: utilization.map((t) => ({
        ...t,
        capacity: n(t.capacity),
        seatsBooked: n(t.seatsBooked),
        utilizationPct: n(t.capacity) ? Math.round((n(t.seatsBooked) / n(t.capacity)) * 100) : 0,
      })),
      outstandingBalances: outstanding.map((b) => ({
        ...b,
        totalAmount: toMoney(b.totalAmount ?? 0),
        paidAmount: toMoney(b.paidAmount ?? 0),
        balance: toMoney(b.balance ?? 0),
        overdue: (b.dueDate ?? '9999') <= today,
      })),
      tripProfitability: profitability.map((t) => {
        // Actual trip expenses once recorded; until then the committed supplier cost is the estimate.
        const actual = new Decimal(t.expenses ?? 0);
        const cost = actual.gt(0) ? actual : new Decimal(t.supplierCost ?? 0);
        const revenue = new Decimal(t.revenue ?? 0);
        const margin = revenue.sub(cost);
        return {
          ...t,
          revenue: toMoney(revenue),
          collected: toMoney(t.collected ?? 0),
          supplierCost: toMoney(t.supplierCost ?? 0),
          expenses: toMoney(actual),
          cost: toMoney(cost),
          costBasis: actual.gt(0) ? 'ACTUAL' : 'ESTIMATED',
          margin: toMoney(margin),
          marginPct: revenue.isZero() ? null : margin.div(revenue).mul(100).toDecimalPlaces(1).toNumber(),
        };
      }),
      expensesByCategory: byCategory.map((x) => ({ category: x.category, amount: toMoney(x.v ?? 0) })),
      bookingSources: bySource.map((x) => ({ source: x.source, bookings: n(x.c), value: toMoney(x.v ?? 0) })),
      paymentMethods: byMethod.map((x) => ({ method: x.method, payments: n(x.c), amount: toMoney(x.v ?? 0) })),
    };
  }
}
