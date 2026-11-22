import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { AuthUser } from '../common/auth.types';
import { assertBranchAccess, branchWhere, officeUser } from '../common/scope';
import { D, toMoney } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isoDate, todayIso, toDate } from '../trips/pricing';

export const REPORT_TYPES = ['bookings', 'upcoming-trips', 'passengers', 'customer-statement', 'payments', 'refunds', 'trip-profit'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** Reports that show money/profit need `reports.financial` on top of `reports.view`. */
const FINANCIAL: ReportType[] = ['payments', 'refunds', 'trip-profit'];

export interface ReportFilters {
  from?: string;
  to?: string;
  tripId?: string;
  customerId?: string;
  status?: string;
}

type Kind = 'text' | 'money' | 'date' | 'int';
interface Column {
  key: string;
  ar: string;
  en: string;
  kind?: Kind;
  width?: number;
}
export interface Report {
  type: ReportType;
  title: { ar: string; en: string };
  columns: Column[];
  rows: Array<Record<string, string | number | null>>;
  /** Totals per currency for money columns (never summed across currencies) */
  totals?: Array<Record<string, string>>;
}

const range = (from?: string, to?: string) => ({
  ...(from ? { gte: toDate(from) } : {}),
  ...(to ? { lt: new Date(toDate(to).getTime() + 86_400_000) } : {}),
});

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async build(user: AuthUser, type: ReportType, f: ReportFilters): Promise<Report> {
    if (FINANCIAL.includes(type) && !user.permissions.includes('reports.financial')) {
      throw new ForbiddenException('This report needs the financial reports permission');
    }
    switch (type) {
      case 'bookings':
        return this.bookings(user, f);
      case 'upcoming-trips':
        return this.upcomingTrips(user);
      case 'passengers':
        return this.passengers(user, f);
      case 'customer-statement':
        return this.customerStatement(user, f);
      case 'payments':
        return this.payments(user, f);
      case 'refunds':
        return this.refunds(user, f);
      case 'trip-profit':
        return this.tripProfit(user, f);
    }
  }

  // ------------------------------------------------------------------ 1. bookings

  private async bookings(user: AuthUser, f: ReportFilters): Promise<Report> {
    const rows = await this.prisma.booking.findMany({
      where: { ...branchWhere(user), createdAt: range(f.from, f.to), ...(f.status ? { status: f.status as never } : {}), ...(f.tripId ? { tripId: f.tripId } : {}) },
      include: { customer: true, trip: { include: { tour: true } }, branch: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    return {
      type: 'bookings',
      title: { ar: 'تقرير الحجوزات', en: 'Bookings report' },
      columns: [
        { key: 'reference', ar: 'رقم الحجز', en: 'Reference', width: 16 },
        { key: 'createdAt', ar: 'تاريخ الحجز', en: 'Booked on', kind: 'date' },
        { key: 'customer', ar: 'الزبون', en: 'Customer', width: 24 },
        { key: 'phone', ar: 'الهاتف', en: 'Phone', width: 16 },
        { key: 'trip', ar: 'الرحلة', en: 'Trip', width: 30 },
        { key: 'departure', ar: 'الانطلاق', en: 'Departure', kind: 'date' },
        { key: 'branch', ar: 'الفرع', en: 'Branch', width: 14 },
        { key: 'status', ar: 'الحالة', en: 'Status', width: 14 },
        { key: 'passengers', ar: 'الركاب', en: 'Passengers', kind: 'int' },
        { key: 'currency', ar: 'العملة', en: 'Currency', width: 8 },
        { key: 'total', ar: 'الإجمالي', en: 'Total', kind: 'money' },
        { key: 'paid', ar: 'المدفوع', en: 'Paid', kind: 'money' },
        { key: 'balance', ar: 'المتبقي', en: 'Balance', kind: 'money' },
      ],
      rows: rows.map((b) => ({
        reference: b.reference,
        createdAt: isoDate(b.createdAt),
        customer: b.customer.fullName,
        phone: b.customer.phone,
        trip: `${b.trip.code} · ${b.trip.tour.name}`,
        departure: isoDate(b.trip.departureDate),
        branch: b.branch.name,
        status: b.status,
        passengers: b.passengerCount,
        currency: b.currencyCode,
        total: toMoney(b.totalAmount),
        paid: toMoney(b.paidAmount),
        balance: b.status === 'CANCELLED' ? '0.00' : toMoney(D(b.totalAmount).sub(D(b.paidAmount))),
      })),
      totals: this.totals(rows.filter((b) => b.status !== 'CANCELLED').map((b) => ({ currency: b.currencyCode, total: b.totalAmount, paid: b.paidAmount, balance: D(b.totalAmount).sub(D(b.paidAmount)) }))),
    };
  }

  // ------------------------------------------------------------------ 2. upcoming trips

  private async upcomingTrips(user: AuthUser): Promise<Report> {
    const trips = await this.prisma.trip.findMany({
      where: { ...branchWhere(user), departureDate: { gte: toDate(todayIso()) }, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
      include: { tour: true, branch: true, _count: { select: { bookings: { where: { status: 'PENDING' } } } } },
      orderBy: { departureDate: 'asc' },
    });
    const waiting = await this.prisma.booking.groupBy({ by: ['tripId'], where: { tripId: { in: trips.map((t) => t.id) }, status: 'WAITING_LIST' }, _sum: { passengerCount: true } });
    return {
      type: 'upcoming-trips',
      title: { ar: 'الرحلات القادمة', en: 'Upcoming trips' },
      columns: [
        { key: 'code', ar: 'الرمز', en: 'Code', width: 12 },
        { key: 'tour', ar: 'البرنامج', en: 'Tour', width: 28 },
        { key: 'branch', ar: 'الفرع', en: 'Branch', width: 14 },
        { key: 'type', ar: 'النوع', en: 'Type', width: 10 },
        { key: 'status', ar: 'الحالة', en: 'Status', width: 18 },
        { key: 'departure', ar: 'الانطلاق', en: 'Departure', kind: 'date' },
        { key: 'return', ar: 'العودة', en: 'Return', kind: 'date' },
        { key: 'closes', ar: 'إغلاق التسجيل', en: 'Registration closes', kind: 'date' },
        { key: 'min', ar: 'الحد الأدنى', en: 'Minimum', kind: 'int' },
        { key: 'max', ar: 'المقاعد', en: 'Seats', kind: 'int' },
        { key: 'confirmed', ar: 'مؤكد', en: 'Confirmed', kind: 'int' },
        { key: 'available', ar: 'متاح', en: 'Available', kind: 'int' },
        { key: 'pending', ar: 'حجوزات معلقة', en: 'Pending bookings', kind: 'int' },
        { key: 'waiting', ar: 'قائمة الانتظار', en: 'Waiting passengers', kind: 'int' },
        { key: 'currency', ar: 'العملة', en: 'Currency', width: 8 },
        { key: 'price', ar: 'السعر للشخص', en: 'Price per person', kind: 'money' },
      ],
      rows: trips.map((t) => ({
        code: t.code,
        tour: t.tour.name,
        branch: t.branch.name,
        type: t.tripType,
        status: t.status,
        departure: isoDate(t.departureDate),
        return: isoDate(t.returnDate),
        closes: isoDate(t.registrationExtendedUntil ?? t.registrationDeadline),
        min: t.minPassengers,
        max: t.maxSeats,
        confirmed: t.confirmedSeats,
        available: t.maxSeats - t.confirmedSeats,
        pending: t._count.bookings,
        waiting: waiting.find((w) => w.tripId === t.id)?._sum.passengerCount ?? 0,
        currency: t.currencyCode,
        price: toMoney(t.sellingPricePerPerson),
      })),
    };
  }

  // ------------------------------------------------------------------ 3. passenger list

  private async passengers(user: AuthUser, f: ReportFilters): Promise<Report> {
    if (!f.tripId) throw new BadRequestException('tripId is required for the passenger list');
    const trip = await this.prisma.trip.findFirst({ where: { id: f.tripId, officeId: officeUser(user).officeId }, include: { tour: true } });
    assertBranchAccess(user, trip, 'Trip');
    const passengers = await this.prisma.bookingPassenger.findMany({
      where: { booking: { tripId: f.tripId, status: 'CONFIRMED' } },
      include: { booking: { include: { customer: true } } },
      orderBy: [{ booking: { reference: 'asc' } }, { sortOrder: 'asc' }],
    });
    return {
      type: 'passengers',
      title: { ar: `قائمة الركاب – ${trip!.code} ${trip!.tour.name} (${isoDate(trip!.departureDate)})`, en: `Passenger list – ${trip!.code} ${trip!.tour.name} (${isoDate(trip!.departureDate)})` },
      columns: [
        { key: 'n', ar: '#', en: '#', kind: 'int', width: 5 },
        { key: 'name', ar: 'اسم الراكب', en: 'Passenger', width: 26 },
        { key: 'dob', ar: 'تاريخ الميلاد', en: 'Date of birth', kind: 'date' },
        { key: 'nationality', ar: 'الجنسية', en: 'Nationality', width: 12 },
        { key: 'docType', ar: 'نوع الوثيقة', en: 'Document', width: 14 },
        { key: 'docNumber', ar: 'رقم الوثيقة', en: 'Document no.', width: 16 },
        { key: 'booking', ar: 'الحجز', en: 'Booking', width: 16 },
        { key: 'contact', ar: 'صاحب الحجز', en: 'Booking contact', width: 24 },
        { key: 'phone', ar: 'هاتف التواصل', en: 'Contact phone', width: 16 },
        { key: 'attended', ar: 'الحضور', en: 'Attended', width: 10 },
        { key: 'notes', ar: 'ملاحظات', en: 'Notes', width: 24 },
      ],
      rows: passengers.map((p, i) => ({
        n: i + 1,
        name: p.fullName,
        dob: p.dateOfBirth ? isoDate(p.dateOfBirth) : null,
        nationality: p.nationality,
        docType: p.documentType,
        docNumber: p.documentNumber,
        booking: p.booking.reference,
        contact: p.booking.customer.fullName,
        phone: p.booking.customer.phone,
        attended: p.attended === null ? '' : p.attended ? '✓' : '✗',
        notes: p.notes,
      })),
    };
  }

  // ------------------------------------------------------------------ 4. customer account statement

  private async customerStatement(user: AuthUser, f: ReportFilters): Promise<Report> {
    if (!f.customerId) throw new BadRequestException('customerId is required for the account statement');
    const customer = await this.prisma.customer.findFirst({ where: { id: f.customerId, officeId: officeUser(user).officeId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const bookings = await this.prisma.booking.findMany({
      where: { ...branchWhere(user), customerId: customer.id },
      include: { trip: { include: { tour: true } }, payments: true, refunds: true },
    });
    type Entry = { date: Date; currency: string; description: string; debit: Prisma.Decimal | null; credit: Prisma.Decimal | null; ref: string };
    const entries: Entry[] = [];
    for (const b of bookings) {
      entries.push({ date: b.createdAt, currency: b.currencyCode, description: `حجز ${b.trip.code} ${b.trip.tour.name} (${b.passengerCount})`, debit: b.totalAmount, credit: null, ref: b.reference });
      if (b.status === 'CANCELLED') entries.push({ date: b.cancelledAt ?? b.updatedAt, currency: b.currencyCode, description: `إلغاء الحجز ${b.reference}`, debit: null, credit: b.totalAmount, ref: b.reference });
      for (const p of b.payments) entries.push({ date: p.paidAt, currency: p.currencyCode, description: `دفعة نقدية`, debit: null, credit: p.amount, ref: p.receiptNumber });
      for (const r of b.refunds) entries.push({ date: r.refundedAt, currency: r.currencyCode, description: `استرجاع: ${r.reason}`, debit: r.amount, credit: null, ref: b.reference });
    }
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    const running = new Map<string, ReturnType<typeof D>>();
    const rows = entries.map((e) => {
      const bal = (running.get(e.currency) ?? D(0)).add(D(e.debit)).sub(D(e.credit));
      running.set(e.currency, bal);
      return { date: isoDate(e.date), ref: e.ref, description: e.description, currency: e.currency, debit: e.debit ? toMoney(e.debit) : null, credit: e.credit ? toMoney(e.credit) : null, balance: toMoney(bal) };
    });
    return {
      type: 'customer-statement',
      title: { ar: `كشف حساب – ${customer.fullName} (${customer.phone})`, en: `Account statement – ${customer.fullName} (${customer.phone})` },
      columns: [
        { key: 'date', ar: 'التاريخ', en: 'Date', kind: 'date' },
        { key: 'ref', ar: 'المرجع', en: 'Reference', width: 18 },
        { key: 'description', ar: 'البيان', en: 'Description', width: 36 },
        { key: 'currency', ar: 'العملة', en: 'Currency', width: 8 },
        { key: 'debit', ar: 'مدين', en: 'Debit', kind: 'money' },
        { key: 'credit', ar: 'دائن', en: 'Credit', kind: 'money' },
        { key: 'balance', ar: 'الرصيد', en: 'Balance', kind: 'money' },
      ],
      rows,
      totals: [...running.entries()].map(([currency, bal]) => ({ currency, balance: toMoney(bal) })),
    };
  }

  // ------------------------------------------------------------------ 5/6. payments & refunds

  private async payments(user: AuthUser, f: ReportFilters): Promise<Report> {
    const rows = await this.prisma.payment.findMany({
      where: { ...branchWhere(user), paidAt: range(f.from, f.to), ...(f.tripId ? { booking: { tripId: f.tripId } } : {}) },
      include: { booking: { include: { customer: true, trip: true } }, branch: true, recordedBy: { include: { user: true } } },
      orderBy: { paidAt: 'desc' },
      take: 5000,
    });
    return {
      type: 'payments',
      title: { ar: 'تقرير الدفعات', en: 'Payments report' },
      columns: [
        { key: 'receipt', ar: 'رقم الإيصال', en: 'Receipt', width: 18 },
        { key: 'date', ar: 'التاريخ', en: 'Date', kind: 'date' },
        { key: 'booking', ar: 'الحجز', en: 'Booking', width: 16 },
        { key: 'customer', ar: 'الزبون', en: 'Customer', width: 24 },
        { key: 'trip', ar: 'الرحلة', en: 'Trip', width: 12 },
        { key: 'branch', ar: 'الفرع', en: 'Branch', width: 14 },
        { key: 'method', ar: 'الطريقة', en: 'Method', width: 8 },
        { key: 'currency', ar: 'العملة', en: 'Currency', width: 8 },
        { key: 'amount', ar: 'المبلغ', en: 'Amount', kind: 'money' },
        { key: 'refunded', ar: 'المسترجع', en: 'Refunded', kind: 'money' },
        { key: 'recordedBy', ar: 'سجلها', en: 'Recorded by', width: 18 },
      ],
      rows: rows.map((p) => ({
        receipt: p.receiptNumber,
        date: isoDate(p.paidAt),
        booking: p.booking.reference,
        customer: p.booking.customer.fullName,
        trip: p.booking.trip.code,
        branch: p.branch.name,
        method: p.method,
        currency: p.currencyCode,
        amount: toMoney(p.amount),
        refunded: toMoney(p.refundedAmount),
        recordedBy: p.recordedBy.user.fullName,
      })),
      totals: this.totals(rows.map((p) => ({ currency: p.currencyCode, amount: p.amount, refunded: p.refundedAmount }))),
    };
  }

  private async refunds(user: AuthUser, f: ReportFilters): Promise<Report> {
    const u = officeUser(user);
    const rows = await this.prisma.refund.findMany({
      where: { officeId: u.officeId, ...(u.scope === 'BRANCH' ? { booking: { branchId: u.branchId } } : {}), refundedAt: range(f.from, f.to) },
      include: { payment: true, booking: { include: { customer: true } }, recordedBy: { include: { user: true } } },
      orderBy: { refundedAt: 'desc' },
    });
    return {
      type: 'refunds',
      title: { ar: 'تقرير المرتجعات', en: 'Refunds report' },
      columns: [
        { key: 'date', ar: 'التاريخ', en: 'Date', kind: 'date' },
        { key: 'booking', ar: 'الحجز', en: 'Booking', width: 16 },
        { key: 'customer', ar: 'الزبون', en: 'Customer', width: 24 },
        { key: 'receipt', ar: 'الإيصال الأصلي', en: 'Original receipt', width: 18 },
        { key: 'currency', ar: 'العملة', en: 'Currency', width: 8 },
        { key: 'amount', ar: 'المبلغ', en: 'Amount', kind: 'money' },
        { key: 'reason', ar: 'السبب', en: 'Reason', width: 30 },
        { key: 'recordedBy', ar: 'سجله', en: 'Recorded by', width: 18 },
      ],
      rows: rows.map((r) => ({
        date: isoDate(r.refundedAt),
        booking: r.booking.reference,
        customer: r.booking.customer.fullName,
        receipt: r.payment.receiptNumber,
        currency: r.currencyCode,
        amount: toMoney(r.amount),
        reason: r.reason,
        recordedBy: r.recordedBy.user.fullName,
      })),
      totals: this.totals(rows.map((r) => ({ currency: r.currencyCode, amount: r.amount }))),
    };
  }

  // ------------------------------------------------------------------ 7. trip pricing & profit

  private async tripProfit(user: AuthUser, f: ReportFilters): Promise<Report> {
    const trips = await this.prisma.trip.findMany({
      where: { ...branchWhere(user), departureDate: range(f.from, f.to), status: { not: 'DRAFT' }, ...(f.tripId ? { id: f.tripId } : {}) },
      include: { tour: true },
      orderBy: { departureDate: 'desc' },
    });
    const ids = trips.map((t) => t.id);
    const [agg, paidSup] = await Promise.all([
      ids.length
        ? this.prisma.$queryRaw<Array<{ trip_id: string; revenue: string; cost: string; collected: string }>>`
            SELECT b.trip_id, SUM(b.total_amount)::text AS revenue, SUM(b.unit_cost * b.passenger_count)::text AS cost, SUM(b.paid_amount)::text AS collected
            FROM bookings b WHERE b.status = 'CONFIRMED' AND b.trip_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) GROUP BY b.trip_id`
        : ([] as Array<{ trip_id: string; revenue: string; cost: string; collected: string }>),
      this.prisma.supplierPayment.groupBy({ by: ['tripId'], where: { tripId: { in: ids } }, _sum: { amount: true } }),
    ]);
    const rows = trips.map((t) => {
      const a = agg.find((x) => x.trip_id === t.id);
      const revenue = D(a?.revenue);
      const cost = D(a?.cost);
      const collected = D(a?.collected);
      const supplierPaid = D(paidSup.find((p) => p.tripId === t.id)?._sum.amount);
      return {
        code: t.code,
        tour: t.tour.name,
        status: t.status,
        departure: isoDate(t.departureDate),
        currency: t.currencyCode,
        passengers: t.confirmedSeats,
        costPerPerson: toMoney(t.costPerPerson),
        pricePerPerson: toMoney(t.sellingPricePerPerson),
        revenue: toMoney(revenue),
        supplierCost: toMoney(cost),
        expectedProfit: toMoney(revenue.sub(cost)),
        marginPct: revenue.isZero() ? null : revenue.sub(cost).div(revenue).mul(100).toDecimalPlaces(1).toNumber(),
        collected: toMoney(collected),
        paidToSuppliers: toMoney(supplierPaid),
        realisedProfit: toMoney(collected.sub(supplierPaid)),
      };
    });
    return {
      type: 'trip-profit',
      title: { ar: 'تسعير الرحلات والأرباح', en: 'Trip pricing and profit' },
      columns: [
        { key: 'code', ar: 'الرمز', en: 'Code', width: 12 },
        { key: 'tour', ar: 'البرنامج', en: 'Tour', width: 26 },
        { key: 'status', ar: 'الحالة', en: 'Status', width: 16 },
        { key: 'departure', ar: 'الانطلاق', en: 'Departure', kind: 'date' },
        { key: 'currency', ar: 'العملة', en: 'Currency', width: 8 },
        { key: 'passengers', ar: 'ركاب مؤكدون', en: 'Confirmed pax', kind: 'int' },
        { key: 'costPerPerson', ar: 'التكلفة للشخص', en: 'Cost / person', kind: 'money' },
        { key: 'pricePerPerson', ar: 'السعر للشخص', en: 'Price / person', kind: 'money' },
        { key: 'revenue', ar: 'الإيراد المتوقع', en: 'Revenue', kind: 'money' },
        { key: 'supplierCost', ar: 'مستحقات الموردين', en: 'Supplier cost', kind: 'money' },
        { key: 'expectedProfit', ar: 'الربح المتوقع', en: 'Expected profit', kind: 'money' },
        { key: 'marginPct', ar: 'هامش %', en: 'Margin %', kind: 'int' },
        { key: 'collected', ar: 'المحصل نقداً', en: 'Collected', kind: 'money' },
        { key: 'paidToSuppliers', ar: 'المدفوع للموردين', en: 'Paid to suppliers', kind: 'money' },
        { key: 'realisedProfit', ar: 'الربح المحقق', en: 'Realised profit', kind: 'money' },
      ],
      rows,
      totals: this.totals(rows.map((r) => ({ currency: r.currency, revenue: r.revenue, supplierCost: r.supplierCost, expectedProfit: r.expectedProfit, collected: r.collected, paidToSuppliers: r.paidToSuppliers, realisedProfit: r.realisedProfit }))),
    };
  }

  // ------------------------------------------------------------------ helpers

  /** Sums money fields per currency. */
  private totals(rows: Array<{ currency: string } & Record<string, unknown>>) {
    const acc = new Map<string, Record<string, ReturnType<typeof D>>>();
    for (const { currency, ...rest } of rows) {
      const t = acc.get(currency) ?? {};
      for (const [k, v] of Object.entries(rest)) t[k] = (t[k] ?? D(0)).add(D(v as string));
      acc.set(currency, t);
    }
    return [...acc.entries()].map(([currency, t]) => ({ currency, ...Object.fromEntries(Object.entries(t).map(([k, v]) => [k, toMoney(v)])) }));
  }

  /** Excel export: RTL sheet for Arabic, typed money/date cells, frozen header, totals per currency. */
  async toExcel(report: Report, lang: 'ar' | 'en', officeName: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Safarni';
    wb.created = new Date();
    const ws = wb.addWorksheet(lang === 'ar' ? 'التقرير' : 'Report', { views: [{ rightToLeft: lang === 'ar', state: 'frozen', ySplit: 3 }] });

    ws.mergeCells(1, 1, 1, report.columns.length);
    ws.getCell(1, 1).value = `${officeName} — ${report.title[lang]}`;
    ws.getCell(1, 1).font = { bold: true, size: 14 };
    ws.getCell(2, 1).value = `${lang === 'ar' ? 'تاريخ الإصدار' : 'Generated'}: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
    ws.getCell(2, 1).font = { color: { argb: 'FF5A6878' }, size: 9 };

    const header = ws.getRow(3);
    report.columns.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c[lang];
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F70AB' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      ws.getColumn(i + 1).width = c.width ?? (c.kind === 'money' ? 16 : c.kind === 'date' ? 12 : 10);
    });
    header.height = 22;

    const write = (values: Record<string, unknown>, bold = false) => {
      const row = ws.addRow(
        report.columns.map((c) => {
          const v = values[c.key];
          if (v === null || v === undefined || v === '') return null;
          if (c.kind === 'money') return Number(v);
          if (c.kind === 'int') return Number(v);
          if (c.kind === 'date') return new Date(`${v}T00:00:00Z`);
          return v;
        }),
      );
      report.columns.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        if (c.kind === 'money') cell.numFmt = '#,##0.00';
        if (c.kind === 'date') cell.numFmt = 'yyyy-mm-dd';
        if (bold) cell.font = { bold: true };
      });
    };
    report.rows.forEach((r) => write(r));
    for (const t of report.totals ?? []) {
      write({ ...t, [report.columns[0].key]: `${lang === 'ar' ? 'الإجمالي' : 'Total'} (${t.currency})`, currency: t.currency }, true);
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
