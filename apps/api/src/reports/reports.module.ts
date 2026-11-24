import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { LABELS } from '@travelos/shared';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import {
  EndOfDay,
  pageArgs,
  paginate,
  PaginationQueryDto,
} from '../common/dto/pagination.dto';
import {
  ExportService,
  ExportSpec,
  MONEY_FMT,
  num,
} from '../common/export/export.service';
import {
  branchOwned,
  isAll,
  ownBranch,
  productVisibility,
} from '../common/scope';
import { D } from '../common/utils/money';
import { money } from '../bookings/bookings.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class StatsQueryDto {
  @ApiPropertyOptional({ enum: ['month', 'year'], default: 'month' })
  @IsOptional()
  @IsIn(['month', 'year'])
  period: 'month' | 'year' = 'month';
  /** month: the 12 months of this year; year: from (year − 4) to year */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number = new Date().getUTCFullYear();
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ enum: ['xlsx'] })
  @IsOptional()
  @IsIn(['xlsx'])
  export?: 'xlsx';
}

export class RangeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @ApiPropertyOptional() @IsOptional() @EndOfDay() @IsDate() to?: Date;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
}

interface StatRow {
  period: string;
  currency: string;
  bookings: number;
  passengers: number;
  revenue: string;
  collected: string;
  expectedProfit: string;
  realizedProfit: string;
}

const STATS_EXPORT: ExportSpec<StatRow> = {
  filename: 'statistics',
  title: 'الإحصائيات',
  columns: [
    { header: 'الفترة', value: (r) => r.period, width: 12 },
    { header: 'العملة', value: (r) => r.currency, width: 8 },
    { header: 'الحجوزات المؤكدة', value: (r) => r.bookings },
    { header: 'الركاب', value: (r) => r.passengers },
    {
      header: 'الإجمالي (الإيرادات)',
      value: (r) => num(r.revenue),
      numFmt: MONEY_FMT,
      width: 20,
    },
    {
      header: 'المحصّل',
      value: (r) => num(r.collected),
      numFmt: MONEY_FMT,
      width: 20,
    },
    {
      header: 'الربح المتوقع',
      value: (r) => num(r.expectedProfit),
      numFmt: MONEY_FMT,
      width: 20,
    },
    {
      header: 'الربح المحقق',
      value: (r) => num(r.realizedProfit),
      numFmt: MONEY_FMT,
      width: 20,
    },
  ],
};

const OUTSTANDING_EXPORT: ExportSpec<
  Awaited<ReturnType<ReportsService['outstanding']>>['data'][number]
> = {
  filename: 'outstanding-balances',
  title: 'الأرصدة المستحقة',
  columns: [
    { header: 'رقم الحجز', value: (b) => b.bookingNo, width: 16 },
    { header: 'الدافع', value: (b) => b.payer.fullName, width: 24 },
    { header: 'الهاتف', value: (b) => b.payer.phone },
    {
      header: 'الحجز على',
      value: (b) => b.trip?.title ?? b.program?.title ?? b.offer?.title,
      width: 28,
    },
    { header: 'الإجمالي', value: (b) => num(b.totalAmount), numFmt: MONEY_FMT },
    { header: 'المدفوع', value: (b) => num(b.netPaid), numFmt: MONEY_FMT },
    { header: 'المتبقي', value: (b) => num(b.balance), numFmt: MONEY_FMT },
    { header: 'العملة', value: (b) => b.currencyCode, width: 8 },
    {
      header: 'الحالة',
      value: (b) => LABELS.bookingStatus[b.status].ar,
    },
    { header: 'الفرع', value: (b) => b.branch.name },
  ],
};

const DAILY_EXPORT: ExportSpec<
  Awaited<ReturnType<ReportsService['dailyPayments']>>['data'][number]
> = {
  filename: 'daily-payments',
  title: 'الدفعات اليومية',
  columns: [
    { header: 'اليوم', value: (r) => r.day, width: 12 },
    { header: 'العملة', value: (r) => r.currency, width: 8 },
    { header: 'عدد الدفعات', value: (r) => r.payments },
    { header: 'المقبوض', value: (r) => num(r.received), numFmt: MONEY_FMT },
    { header: 'المسترجع', value: (r) => num(r.refunded), numFmt: MONEY_FMT },
    { header: 'الصافي', value: (r) => num(r.net), numFmt: MONEY_FMT },
  ],
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * RPT-04, RPT-05, B.6 — per period and per currency (money is never mixed across currencies):
   *  - bookings, passengers and revenue (الإجمالي) of bookings confirmed in the period
   *  - collected: payments minus refunds received in the period
   *  - expected profit: revenue − supplier cost of those bookings
   *  - realized profit (TBD-12): bookings of trips/programs/offers that FINISHED in the period and are fully paid
   */
  async stats(q: StatsQueryDto) {
    const byYear = q.period === 'year';
    const from = new Date(Date.UTC(byYear ? q.year - 4 : q.year, 0, 1));
    const to = new Date(Date.UTC(q.year + 1, 0, 1));
    const fmt = byYear ? 'YYYY' : 'YYYY-MM';
    const branch = q.branchId
      ? Prisma.sql`AND b.branch_id = ${q.branchId}::uuid`
      : Prisma.empty;
    const category = q.categoryId
      ? Prisma.sql`AND COALESCE(t.category_id, p.category_id) = ${q.categoryId}::uuid`
      : Prisma.empty;

    const [sales, collected, realized] = await Promise.all([
      this.prisma.$queryRaw<
        {
          period: string;
          currency: string;
          bookings: bigint;
          passengers: bigint;
          revenue: Prisma.Decimal;
          profit: Prisma.Decimal;
        }[]
      >`
        SELECT to_char(b.confirmed_at AT TIME ZONE 'UTC', ${fmt}) AS period, b.currency_code AS currency,
               COUNT(*)::bigint AS bookings, SUM(b.passenger_count)::bigint AS passengers,
               SUM(b.total_amount) AS revenue,
               SUM(b.total_amount - b.cost_per_person * b.passenger_count) AS profit
        FROM bookings b LEFT JOIN trips t ON t.id = b.trip_id LEFT JOIN programs p ON p.id = b.program_id
        WHERE b.status = 'CONFIRMED' AND b.confirmed_at >= ${from} AND b.confirmed_at < ${to} ${branch} ${category}
        GROUP BY 1, 2`,
      this.prisma.$queryRaw<
        { period: string; currency: string; net: Prisma.Decimal }[]
      >`
        SELECT to_char(pay.paid_at AT TIME ZONE 'UTC', ${fmt}) AS period, pay.currency_code AS currency,
               SUM(CASE WHEN pay.kind = 'REFUND' THEN -pay.amount ELSE pay.amount END) AS net
        FROM payments pay JOIN bookings b ON b.id = pay.booking_id
        LEFT JOIN trips t ON t.id = b.trip_id LEFT JOIN programs p ON p.id = b.program_id
        WHERE pay.paid_at >= ${from} AND pay.paid_at < ${to} ${branch} ${category}
        GROUP BY 1, 2`,
      this.prisma.$queryRaw<
        { period: string; currency: string; profit: Prisma.Decimal }[]
      >`
        SELECT to_char(x.finished_at AT TIME ZONE 'UTC', ${fmt}) AS period, x.currency_code AS currency,
               SUM(x.total_amount - x.cost_per_person * x.passenger_count) AS profit
        FROM (
          SELECT b.*, CASE
              WHEN b.trip_id IS NOT NULL THEN t.ends_at
              WHEN b.program_id IS NOT NULL THEN (SELECT MAX(lt.ends_at) FROM program_trips pt JOIN trips lt ON lt.id = pt.trip_id WHERE pt.program_id = b.program_id)
              ELSE o.valid_to::timestamptz END AS finished_at,
            COALESCE(t.status::text, p.status::text, CASE WHEN o.valid_to < CURRENT_DATE THEN 'COMPLETED' ELSE 'OPEN' END) AS product_status
          FROM bookings b
          LEFT JOIN trips t ON t.id = b.trip_id LEFT JOIN programs p ON p.id = b.program_id LEFT JOIN offers o ON o.id = b.offer_id
          WHERE b.status = 'CONFIRMED' AND b.paid_amount - b.refunded_amount >= b.total_amount ${branch} ${category}
        ) x
        WHERE x.product_status = 'COMPLETED' AND x.finished_at >= ${from} AND x.finished_at < ${to}
        GROUP BY 1, 2`,
    ]);

    const rows = new Map<string, StatRow>();
    const row = (period: string, currency: string) => {
      const key = `${period}|${currency}`;
      if (!rows.has(key))
        rows.set(key, {
          period,
          currency,
          bookings: 0,
          passengers: 0,
          revenue: '0.00',
          collected: '0.00',
          expectedProfit: '0.00',
          realizedProfit: '0.00',
        });
      return rows.get(key)!;
    };
    // every period appears, even when empty, so charts have a continuous axis
    const periods = byYear
      ? Array.from({ length: 5 }, (_, i) => String(q.year - 4 + i))
      : Array.from(
          { length: 12 },
          (_, i) => `${q.year}-${String(i + 1).padStart(2, '0')}`,
        );
    const currencies = new Set<string>([
      ...sales.map((s) => s.currency),
      ...collected.map((c) => c.currency),
      ...realized.map((r) => r.currency),
    ]);
    if (!currencies.size)
      currencies.add(
        (await this.prisma.siteSetting.findUnique({ where: { id: 1 } }))
          ?.defaultCurrencyCode ?? 'SYP',
      );
    for (const p of periods) for (const c of currencies) row(p, c);
    for (const s of sales)
      Object.assign(row(s.period, s.currency), {
        bookings: Number(s.bookings),
        passengers: Number(s.passengers),
        revenue: D(s.revenue).toFixed(2),
        expectedProfit: D(s.profit).toFixed(2),
      });
    for (const c of collected)
      row(c.period, c.currency).collected = D(c.net).toFixed(2);
    for (const r of realized)
      row(r.period, r.currency).realizedProfit = D(r.profit).toFixed(2);

    const series = [...rows.values()].sort(
      (a, b) =>
        a.period.localeCompare(b.period) ||
        a.currency.localeCompare(b.currency),
    );
    const totals: Record<string, Omit<StatRow, 'period' | 'currency'>> = {};
    for (const r of series) {
      const t = (totals[r.currency] ??= {
        bookings: 0,
        passengers: 0,
        revenue: '0.00',
        collected: '0.00',
        expectedProfit: '0.00',
        realizedProfit: '0.00',
      });
      t.bookings += r.bookings;
      t.passengers += r.passengers;
      for (const k of [
        'revenue',
        'collected',
        'expectedProfit',
        'realizedProfit',
      ] as const)
        t[k] = D(t[k]).add(D(r[k])).toFixed(2);
    }
    return { period: q.period, year: q.year, from, to, series, totals };
  }

  /** Bookings that still owe money (RPT-07). */
  async outstanding(user: AuthUser, q: RangeQueryDto) {
    const ids = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM bookings WHERE status <> 'CANCELLED' AND total_amount - (paid_amount - refunded_amount) > 0`;
    const where: Prisma.BookingWhereInput = {
      id: { in: ids.map((r) => r.id) },
      ...branchOwned(user, q.branchId),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: q.from } : {}),
              ...(q.to ? { lte: q.to } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: {
          payer: { select: { fullName: true, phone: true } },
          branch: { select: { name: true } },
          trip: { select: { title: true, startsAt: true } },
          program: { select: { title: true } },
          offer: { select: { title: true } },
        },
        orderBy: { createdAt: 'asc' },
        ...pageArgs(q),
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginate(
      rows.map((b) => ({ ...b, costPerPerson: undefined, ...money(b) })),
      total,
      q,
    );
  }

  /** Daily cash per currency (RPT-07). */
  async dailyPayments(user: AuthUser, q: RangeQueryDto) {
    const to = q.to ?? new Date();
    const from = q.from ?? new Date(to.getTime() - 30 * 86_400_000);
    const scope = branchOwned(user, q.branchId).branchId;
    const branch = scope
      ? Prisma.sql`AND branch_id = ${scope}::uuid`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        day: string;
        currency: string;
        payments: bigint;
        received: Prisma.Decimal;
        refunded: Prisma.Decimal;
      }[]
    >`
      SELECT to_char(paid_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, currency_code AS currency, COUNT(*)::bigint AS payments,
             COALESCE(SUM(amount) FILTER (WHERE kind <> 'REFUND'), 0) AS received,
             COALESCE(SUM(amount) FILTER (WHERE kind = 'REFUND'), 0) AS refunded
      FROM payments WHERE paid_at >= ${from} AND paid_at <= ${to} ${branch}
      GROUP BY 1, 2 ORDER BY 1 DESC, 2`;
    const data = rows.map((r) => ({
      day: r.day,
      currency: r.currency,
      payments: Number(r.payments),
      received: D(r.received).toFixed(2),
      refunded: D(r.refunded).toFixed(2),
      net: D(r.received).sub(D(r.refunded)).toFixed(2),
    }));
    return paginate(data, data.length, {
      ...q,
      export: 'all',
    });
  }

  // ------------------------------------------------------------------ dashboard (DSH-01..04)

  async dashboard(user: AuthUser) {
    const now = new Date();
    const soon = new Date(now.getTime() + 14 * 86_400_000);
    if (user.scope === 'ASSIGNED') {
      const trips = await this.prisma.trip.findMany({
        where: {
          guides: { some: { userId: user.userId } },
          endsAt: { gte: now },
          status: { notIn: ['CANCELLED', 'DRAFT'] },
        },
        include: {
          originCity: { select: { nameAr: true } },
          destinationCity: { select: { nameAr: true } },
        },
        orderBy: { startsAt: 'asc' },
        take: 20,
      });
      return {
        role: 'TOUR_GUIDE',
        myTrips: trips.map((t) => ({
          id: t.id,
          code: t.code,
          title: t.title,
          startsAt: t.startsAt,
          endsAt: t.endsAt,
          status: t.status,
          passengers: t.confirmedSeats,
          from: t.originCity.nameAr,
          to: t.destinationCity.nameAr,
        })),
      };
    }

    const branchId = isAll(user) ? undefined : ownBranch(user);
    const bWhere: Prisma.BookingWhereInput = branchId ? { branchId } : {};
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const [upcoming, recent, pending, newRequests, monthBookings, monthCash] =
      await Promise.all([
        this.prisma.trip.findMany({
          where: {
            AND: [
              productVisibility(user),
              { startsAt: { gte: now, lte: soon } },
              { status: { in: ['OPEN', 'CLOSED', 'CONFIRMED'] } },
            ],
          },
          select: {
            id: true,
            code: true,
            title: true,
            startsAt: true,
            status: true,
            confirmedSeats: true,
            maxPassengers: true,
            minPassengers: true,
            registrationDeadline: true,
          },
          orderBy: { startsAt: 'asc' },
          take: 8,
        }),
        user.permissions.includes('bookings.view')
          ? this.prisma.booking.findMany({
              where: bWhere,
              include: {
                payer: { select: { fullName: true } },
                trip: { select: { code: true, title: true } },
                program: { select: { code: true, title: true } },
                offer: { select: { title: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 8,
            })
          : Promise.resolve([]),
        this.prisma.booking.count({ where: { ...bWhere, status: 'PENDING' } }),
        user.permissions.includes('requests.view')
          ? this.prisma.customTripRequest.count({
              where: {
                status: 'NEW',
                ...(branchId ? { assignedBranchId: branchId } : {}),
              },
            })
          : Promise.resolve(0),
        this.prisma.booking.groupBy({
          by: ['currencyCode'],
          where: {
            ...bWhere,
            status: 'CONFIRMED',
            confirmedAt: { gte: monthStart },
          },
          _count: { _all: true },
          _sum: { totalAmount: true, passengerCount: true },
          orderBy: { currencyCode: 'asc' },
        }),
        this.prisma.$queryRaw<{ currency: string; net: Prisma.Decimal }[]>`
        SELECT currency_code AS currency, SUM(CASE WHEN kind = 'REFUND' THEN -amount ELSE amount END) AS net
        FROM payments WHERE paid_at >= ${monthStart} ${branchId ? Prisma.sql`AND branch_id = ${branchId}::uuid` : Prisma.empty} GROUP BY 1`,
      ]);

    const month = monthBookings.map((m) => ({
      currency: m.currencyCode,
      bookings: m._count._all,
      passengers: m._sum?.passengerCount ?? 0,
      revenue: D(m._sum?.totalAmount ?? 0).toFixed(2),
      collected: D(
        monthCash.find((c) => c.currency === m.currencyCode)?.net ?? 0,
      ).toFixed(2),
    }));
    for (const c of monthCash)
      if (!month.some((m) => m.currency === c.currency))
        month.push({
          currency: c.currency,
          bookings: 0,
          passengers: 0,
          revenue: '0.00',
          collected: D(c.net).toFixed(2),
        });

    const base = {
      role: user.roleCode,
      month,
      upcomingTrips: upcoming,
      recentBookings: recent.map((b) => ({
        id: b.id,
        bookingNo: b.bookingNo,
        status: b.status,
        payer: b.payer.fullName,
        target: b.trip?.title ?? b.program?.title ?? b.offer?.title,
        totalAmount: b.totalAmount,
        currencyCode: b.currencyCode,
        createdAt: b.createdAt,
      })),
      pendingBookings: pending,
      newRequests,
    };
    if (!user.permissions.includes('stats.view')) return base;
    // DSH-01: the Admin also sees this month's profit
    const stats = await this.stats({
      period: 'month',
      year: now.getUTCFullYear(),
    });
    const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const awaitingDecision = await this.prisma.trip.count({
      where: { status: 'CLOSED' },
    });
    return {
      ...base,
      profit: stats.series.filter((s) => s.period === thisMonth),
      yearSeries: stats.series,
      awaitingDecision,
    };
  }

  // ------------------------------------------------------------------ notifications (AUD-04)

  async notifications(user: AuthUser) {
    const items: {
      type: string;
      severity: 'info' | 'warning' | 'danger';
      count: number;
      link: string;
    }[] = [];
    const now = new Date();
    const settings = await this.prisma.siteSetting.findUnique({
      where: { id: 1 },
    });
    const branchId = isAll(user) ? undefined : (user.branchId ?? undefined);
    const has = (p: string) => user.permissions.includes(p as never);

    if (has('requests.view')) {
      const n = await this.prisma.customTripRequest.count({
        where: {
          status: 'NEW',
          ...(branchId ? { assignedBranchId: branchId } : {}),
        },
      });
      if (n)
        items.push({
          type: 'NEW_REQUESTS',
          severity: 'info',
          count: n,
          link: '/dashboard/requests?status=NEW',
        });
    }
    if (has('trips.view')) {
      const horizon = new Date(
        now.getTime() + (settings?.deadlineWarningDays ?? 3) * 86_400_000,
      );
      const n = await this.prisma.trip.count({
        where: {
          AND: [
            productVisibility(user),
            { status: 'OPEN', registrationDeadline: { gt: now, lte: horizon } },
          ],
        },
      });
      if (n)
        items.push({
          type: 'DEADLINES_SOON',
          severity: 'warning',
          count: n,
          link: '/dashboard/trips?status=OPEN&sort=registrationDeadline&order=asc',
        });
    }
    if (has('trips.close')) {
      const n = await this.prisma.trip.count({
        where: { AND: [productVisibility(user), { status: 'CLOSED' }] },
      });
      const p = await this.prisma.program.count({
        where: {
          status: 'CLOSED',
          ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
        },
      });
      if (n + p)
        items.push({
          type: 'AWAITING_DECISION',
          severity: 'warning',
          count: n + p,
          link: '/dashboard/trips?status=CLOSED',
        });
    }
    if (has('pricing.set_profit')) {
      const n = await this.prisma.trip.count({
        where: {
          costChangedAt: { not: null },
          status: { in: ['DRAFT', 'OPEN'] },
        },
      });
      if (n)
        items.push({
          type: 'COSTS_CHANGED',
          severity: 'warning',
          count: n,
          link: '/dashboard/trips?costChanged=true',
        });
    }
    if (has('integrations.manage')) {
      const n = await this.prisma.integrationConnection.count({
        where: { status: 'ERROR' },
      });
      if (n)
        items.push({
          type: 'INTEGRATION_ERRORS',
          severity: 'danger',
          count: n,
          link: '/dashboard/integrations',
        });
    }
    if (has('visas.manage')) {
      const horizon = new Date(
        now.getTime() + (settings?.visaWarningDays ?? 14) * 86_400_000,
      );
      const n = await this.prisma.visaApplication.count({
        where: {
          status: { not: 'APPROVED' },
          passenger: {
            booking: {
              status: { not: 'CANCELLED' },
              ...(branchId ? { branchId } : {}),
              OR: [
                { trip: { startsAt: { gte: now, lte: horizon } } },
                {
                  program: {
                    legs: {
                      some: {
                        sequenceNo: 1,
                        trip: { startsAt: { gte: now, lte: horizon } },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      });
      if (n)
        items.push({
          type: 'VISAS_MISSING',
          severity: 'danger',
          count: n,
          link: '/dashboard/visas?dueSoon=true',
        });
    }
    return { items, total: items.reduce((a, i) => a + i.count, 0) };
  }
}

@ApiTags('Reports & statistics')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly exporter: ExportService,
  ) {}

  @Get('stats')
  @RequirePermissions('stats.view')
  @ApiOperation({
    summary:
      'Monthly or yearly totals, bookings and profit per currency — Admin only (RPT-04, RPT-05)',
  })
  async stats(@CurrentUser() user: AuthUser, @Query() q: StatsQueryDto) {
    const result = await this.reports.stats(q);
    if (q.export !== 'xlsx') return result;
    return this.exporter.respond(
      { export: 'xlsx' } as PaginationQueryDto,
      paginate(result.series, result.series.length, {
        export: 'all',
      } as PaginationQueryDto),
      {
        ...STATS_EXPORT,
        title: `الإحصائيات ${q.period === 'year' ? 'السنوية' : 'الشهرية'} ${q.year}`,
      },
      user,
    );
  }

  @Get('reports/outstanding')
  @RequirePermissions('reports.operational', 'bookings.view')
  @ApiOperation({
    summary:
      'Bookings with a balance still due (RPT-07). Supports export=xlsx|all.',
  })
  async outstanding(@CurrentUser() user: AuthUser, @Query() q: RangeQueryDto) {
    return this.exporter.respond(
      q,
      await this.reports.outstanding(user, q),
      OUTSTANDING_EXPORT,
      user,
    );
  }

  @Get('reports/daily-payments')
  @RequirePermissions('reports.operational', 'payments.view')
  @ApiOperation({
    summary:
      'Cash received and refunded per day and currency (RPT-07). Supports export=xlsx.',
  })
  async daily(@CurrentUser() user: AuthUser, @Query() q: RangeQueryDto) {
    return this.exporter.respond(
      q,
      await this.reports.dailyPayments(user, q),
      DAILY_EXPORT,
      user,
    );
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Home page data for the signed-in role (DSH-01..04)',
  })
  dashboard(@CurrentUser() user: AuthUser) {
    return this.reports.dashboard(user);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Live alerts for the signed-in role (AUD-04)' })
  notifications(@CurrentUser() user: AuthUser) {
    return this.reports.notifications(user);
  }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
