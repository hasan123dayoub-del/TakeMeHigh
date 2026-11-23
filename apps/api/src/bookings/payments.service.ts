import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { ilike, orderArgs, pageArgs, paginate } from '../common/dto/pagination.dto';
import { assertBranchRecord, branchOwned } from '../common/scope';
import { receiptNumber } from '../common/utils/codes';
import { D } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';
import type { PaymentQueryDto, RecordPaymentDto, RefundDto } from './bookings.dto';
import { money } from './bookings.service';

export const paymentInclude = {
  booking: {
    select: {
      id: true,
      bookingNo: true,
      currencyCode: true,
      payer: { select: { id: true, fullName: true, phone: true } },
      trip: { select: { code: true, title: true } },
      program: { select: { code: true, title: true } },
      offer: { select: { title: true } },
    },
  },
  branch: { select: { id: true, name: true } },
  receivedBy: { select: { id: true, fullName: true } },
  refundOf: { select: { id: true, receiptNo: true } },
} satisfies Prisma.PaymentInclude;

/**
 * Cash payments and refunds (PAY-01..10). Payments are append-only (database trigger): a mistake
 * is corrected with a REFUND linked to the original payment, never by editing it (BR-13).
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, q: PaymentQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      AND: [
        branchOwned(user, q.branchId),
        q.kind ? { kind: q.kind } : {},
        q.bookingId ? { bookingId: q.bookingId } : {},
        q.receivedById ? { receivedById: q.receivedById } : {},
        q.currencyCode ? { currencyCode: q.currencyCode } : {},
        q.from || q.to ? { paidAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {},
        q.search ? { OR: [{ receiptNo: ilike(q.search) }, { payerName: ilike(q.search) }, { booking: { bookingNo: ilike(q.search) } }] } : {},
      ],
    };
    const [rows, total, sums] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, include: paymentInclude, orderBy: orderArgs(q, ['paidAt', 'amount', 'receiptNo'] as const, 'paidAt'), ...pageArgs(q) }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.groupBy({ by: ['currencyCode', 'kind'], where, _sum: { amount: true }, orderBy: { currencyCode: 'asc' } }),
    ]);
    const totals: Record<string, { received: string; refunded: string; net: string }> = {};
    for (const s of sums) {
      const t = (totals[s.currencyCode] ??= { received: '0.00', refunded: '0.00', net: '0.00' });
      const amount = D(s._sum?.amount ?? 0);
      if (s.kind === 'REFUND') t.refunded = D(t.refunded).add(amount).toFixed(2);
      else t.received = D(t.received).add(amount).toFixed(2);
      t.net = D(t.received).sub(D(t.refunded)).toFixed(2);
    }
    return { ...paginate(rows, total, q), totals };
  }

  async record(user: AuthUser, bookingId: string, dto: RecordPaymentDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (existing) {
        if (existing.bookingId !== bookingId) throw new ConflictException('This payment key was already used for another booking');
        return this.receipt(user, existing.id);
      }
    }
    const amount = D(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('The amount must be greater than zero');
    const payment = await this.prisma.$transaction(async (tx) => {
      const b = await this.lock(tx, user, bookingId);
      if (b.status === 'CANCELLED') throw new ConflictException('A cancelled booking takes no payments; record refunds instead');
      const { balance } = money(b);
      if (amount.gt(D(balance))) throw new BadRequestException(`The amount is more than the remaining balance (${balance} ${b.currencyCode}) (PAY-02)`);
      const balanceAfter = D(balance).sub(amount);
      const p = await tx.payment.create({
        data: {
          receiptNo: await receiptNumber(tx),
          bookingId,
          branchId: b.branchId,
          kind: balanceAfter.lte(0) ? 'FULL' : 'PARTIAL',
          amount: amount.toFixed(2),
          currencyCode: b.currencyCode,
          method: dto.method ?? 'CASH',
          payerName: dto.payerName?.trim() || b.payer.fullName,
          paidAt: dto.paidAt ?? new Date(),
          balanceAfter: balanceAfter.toFixed(2),
          notes: dto.notes,
          idempotencyKey: dto.idempotencyKey,
          receivedById: user.userId,
        },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { paidAmount: { increment: amount.toFixed(2) } } });
      await tx.bookingEvent.create({ data: { bookingId, type: 'PAYMENT', actorId: user.userId, data: { receiptNo: p.receiptNo, amount: p.amount.toString(), kind: p.kind } } });
      await this.audit.log(user, { action: 'payment.recorded', entityType: 'payment', entityId: p.id, summary: `${p.receiptNo}: ${p.amount.toString()} ${p.currencyCode} on ${b.bookingNo} (${p.kind.toLowerCase()})` }, tx);
      return p;
    });
    return this.receipt(user, payment.id);
  }

  /** PAY-06: Admin only (permission), never more than what is left of the original payment. */
  async refund(user: AuthUser, paymentId: string, dto: RefundDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (existing) return this.receipt(user, existing.id);
    }
    const amount = D(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('The amount must be greater than zero');
    const refund = await this.prisma.$transaction(async (tx) => {
      const original = await tx.payment.findUnique({ where: { id: paymentId }, include: { refunds: true } });
      assertBranchRecord(user, original, 'Payment');
      if (original.kind === 'REFUND') throw new BadRequestException('A refund cannot itself be refunded');
      const b = await this.lock(tx, user, original.bookingId);
      const refunded = original.refunds.reduce((acc, r) => acc.add(D(r.amount)), D(0));
      const refundable = D(original.amount).sub(refunded);
      if (amount.gt(refundable)) throw new BadRequestException(`At most ${refundable.toFixed(2)} ${original.currencyCode} of this payment can still be refunded`);
      const balanceAfter = D(money(b).balance).add(amount);
      const r = await tx.payment.create({
        data: {
          receiptNo: await receiptNumber(tx),
          bookingId: b.id,
          branchId: b.branchId,
          kind: 'REFUND',
          refundOfId: original.id,
          amount: amount.toFixed(2),
          currencyCode: original.currencyCode,
          method: original.method,
          payerName: original.payerName,
          paidAt: new Date(),
          balanceAfter: balanceAfter.toFixed(2),
          reason: dto.reason,
          idempotencyKey: dto.idempotencyKey,
          receivedById: user.userId,
        },
      });
      await tx.booking.update({ where: { id: b.id }, data: { refundedAmount: { increment: amount.toFixed(2) } } });
      await tx.bookingEvent.create({ data: { bookingId: b.id, type: 'REFUND', actorId: user.userId, data: { receiptNo: r.receiptNo, of: original.receiptNo, amount: r.amount.toString(), reason: dto.reason } } });
      await this.audit.log(user, { action: 'payment.refunded', entityType: 'payment', entityId: r.id, summary: `${r.receiptNo}: refund of ${r.amount.toString()} ${r.currencyCode} from ${original.receiptNo} — ${dto.reason}` }, tx);
      return r;
    });
    return this.receipt(user, refund.id);
  }

  /**
   * PAY-04: everything the PDF receipt prints — payer, payment type (partial/full), receipt number,
   * date, amount — plus the office identity, booking, remaining balance and employee.
   */
  async receipt(user: AuthUser, id: string) {
    const p = await this.prisma.payment.findUnique({ where: { id }, include: paymentInclude });
    assertBranchRecord(user, p, 'Payment');
    const [settings, prints, booking] = await Promise.all([
      this.prisma.siteSetting.findUnique({ where: { id: 1 }, select: { officeName: true, officeNameEn: true, logoUrl: true, phone: true, address: true, email: true } }),
      this.prisma.auditLog.count({ where: { action: 'payment.printed', entityId: id } }),
      this.prisma.booking.findUniqueOrThrow({ where: { id: p.bookingId }, select: { totalAmount: true, paidAmount: true, refundedAmount: true } }),
    ]);
    return {
      ...p,
      office: settings,
      target: p.booking.trip ? `${p.booking.trip.code} — ${p.booking.trip.title}` : p.booking.program ? `${p.booking.program.code} — ${p.booking.program.title}` : (p.booking.offer?.title ?? ''),
      bookingTotals: { total: booking.totalAmount.toString(), ...money(booking) },
      printCount: prints,
    };
  }

  /** PAY-08: the first print is the original; every later print is marked "copy". */
  async printed(user: AuthUser, id: string) {
    const r = await this.receipt(user, id);
    await this.audit.log(user, { action: 'payment.printed', entityType: 'payment', entityId: id, summary: `Receipt ${r.receiptNo} printed${r.printCount ? ' (copy)' : ''}` });
    return { copy: r.printCount > 0, printNumber: r.printCount + 1 };
  }

  private async lock(tx: Tx, user: AuthUser, bookingId: string) {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId}::uuid FOR UPDATE`;
    const b = await tx.booking.findUnique({ where: { id: bookingId }, include: { payer: { select: { fullName: true } } } });
    if (!b) throw new NotFoundException('Booking not found');
    assertBranchRecord(user, b, 'Booking');
    return b;
  }
}

