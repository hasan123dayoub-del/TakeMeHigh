import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth.types';
import { likeTerm, paginate } from '../../common/dto/pagination.dto';
import { Decimal, toMoney } from '../../common/utils/money';
import { findOwned } from '../../common/utils/tenant';
import { ActivityService } from '../activity/activity.service';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Trip } from '../trips/entities/trip.entity';
import { CreateExpenseDto, ExpenseQueryDto, PaymentQueryDto, UpdateExpenseDto } from './dto/finance.dto';
import { Expense } from './entities/expense.entity';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectDataSource() private readonly db: DataSource,
    private readonly activity: ActivityService,
  ) {}

  /** Headline numbers for the Finance page. */
  async summary(agencyId: string) {
    const [row] = await this.db.query(
      `SELECT
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE agency_id = ?) AS collected,
        (SELECT COALESCE(SUM(amount),0) FROM refunds WHERE agency_id = ?) AS refunded,
        (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE agency_id = ?) AS expenses,
        (SELECT COALESCE(SUM(total_amount - paid_amount),0) FROM bookings
           WHERE agency_id = ? AND status <> 'CANCELLED') AS outstanding,
        (SELECT COALESCE(SUM(amount),0) FROM payments
           WHERE agency_id = ? AND paid_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')) AS collectedThisMonth,
        (SELECT COALESCE(SUM(amount),0) FROM expenses
           WHERE agency_id = ? AND expense_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')) AS expensesThisMonth`,
      Array(6).fill(agencyId),
    );
    const netRevenue = new Decimal(row.collected).sub(row.refunded);
    return {
      collected: toMoney(row.collected),
      refunded: toMoney(row.refunded),
      netRevenue: toMoney(netRevenue),
      expenses: toMoney(row.expenses),
      profit: toMoney(netRevenue.sub(row.expenses)),
      outstanding: toMoney(row.outstanding),
      collectedThisMonth: toMoney(row.collectedThisMonth),
      expensesThisMonth: toMoney(row.expensesThisMonth),
    };
  }

  async listPayments(agencyId: string, q: PaymentQueryDto) {
    const qb = this.payments
      .createQueryBuilder('p')
      .innerJoin('p.booking', 'b')
      .innerJoin('b.customer', 'c')
      .innerJoin('b.trip', 't')
      .leftJoin('p.receivedBy', 'u')
      .addSelect(['b.id', 'b.reference', 'c.id', 'c.firstName', 'c.lastName', 't.id', 't.code', 't.title', 'u.id', 'u.fullName'])
      .where('p.agencyId = :agencyId', { agencyId });
    if (q.method) qb.andWhere('p.method = :method', { method: q.method });
    if (q.from) qb.andWhere('p.paidAt >= :from', { from: q.from });
    if (q.to) qb.andWhere('p.paidAt < DATE_ADD(:to, INTERVAL 1 DAY)', { to: q.to });
    if (q.search) {
      qb.andWhere("(b.reference LIKE :s OR p.reference LIKE :s OR CONCAT(c.firstName, ' ', c.lastName) LIKE :s)", {
        s: likeTerm(q.search),
      });
    }
    const [rows, total] = await qb
      .orderBy('p.paidAt', q.order)
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();
    return paginate(rows, total, q.page, q.pageSize);
  }

  async listRefunds(agencyId: string, q: PaymentQueryDto) {
    const qb = this.refunds
      .createQueryBuilder('r')
      .innerJoin('r.booking', 'b')
      .innerJoin('b.customer', 'c')
      .leftJoin('r.processedBy', 'u')
      .addSelect(['b.id', 'b.reference', 'c.id', 'c.firstName', 'c.lastName', 'u.id', 'u.fullName'])
      .where('r.agencyId = :agencyId', { agencyId });
    if (q.from) qb.andWhere('r.refundedAt >= :from', { from: q.from });
    if (q.to) qb.andWhere('r.refundedAt < DATE_ADD(:to, INTERVAL 1 DAY)', { to: q.to });
    const [rows, total] = await qb
      .orderBy('r.refundedAt', q.order)
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();
    return paginate(rows, total, q.page, q.pageSize);
  }

  async listExpenses(agencyId: string, q: ExpenseQueryDto) {
    const qb = this.expenses
      .createQueryBuilder('e')
      .leftJoin('e.trip', 't')
      .leftJoin('e.supplier', 's')
      .leftJoin('e.createdBy', 'u')
      .addSelect(['t.id', 't.code', 't.title', 's.id', 's.name', 's.type', 'u.id', 'u.fullName'])
      .where('e.agencyId = :agencyId', { agencyId });
    if (q.category) qb.andWhere('e.category = :category', { category: q.category });
    if (q.tripId) qb.andWhere('e.tripId = :tripId', { tripId: q.tripId });
    if (q.supplierId) qb.andWhere('e.supplierId = :supplierId', { supplierId: q.supplierId });
    if (q.from) qb.andWhere('e.expenseDate >= :from', { from: q.from });
    if (q.to) qb.andWhere('e.expenseDate <= :to', { to: q.to });
    if (q.search) qb.andWhere('(e.description LIKE :s OR e.reference LIKE :s)', { s: likeTerm(q.search) });
    const [rows, total] = await qb
      .orderBy('e.expenseDate', q.order)
      .addOrderBy('e.createdAt', 'DESC')
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();
    return paginate(rows, total, q.page, q.pageSize);
  }

  async createExpense(user: AuthUser, dto: CreateExpenseDto) {
    await this.assertLinks(user.agencyId, dto.tripId, dto.supplierId);
    if (Number(dto.amount) <= 0) throw new BadRequestException('Amount must be greater than zero');
    const expense = await this.expenses.save(
      this.expenses.create({
        ...dto,
        reference: dto.reference ?? null,
        tripId: dto.tripId ?? null,
        supplierId: dto.supplierId ?? null,
        agencyId: user.agencyId,
        createdById: user.userId,
      }),
    );
    await this.activity.log({
      agencyId: user.agencyId,
      userId: user.userId,
      action: 'expense.recorded',
      entityType: 'expense',
      entityId: expense.id,
      summary: `Recorded expense "${expense.description}" · ${expense.amount}`,
    });
    return expense;
  }

  async updateExpense(user: AuthUser, id: string, dto: UpdateExpenseDto) {
    const expense = await findOwned(this.expenses, id, user.agencyId, undefined, 'Expense');
    await this.assertLinks(user.agencyId, dto.tripId, dto.supplierId);
    if (dto.amount !== undefined && Number(dto.amount) <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }
    Object.assign(expense, dto);
    return this.expenses.save(expense);
  }

  async removeExpense(user: AuthUser, id: string) {
    const expense = await findOwned(this.expenses, id, user.agencyId, undefined, 'Expense');
    await this.expenses.delete({ id, agencyId: user.agencyId });
    await this.activity.log({
      agencyId: user.agencyId,
      userId: user.userId,
      action: 'expense.deleted',
      entityType: 'expense',
      entityId: id,
      summary: `Deleted expense "${expense.description}"`,
    });
    return { deleted: true };
  }

  private async assertLinks(agencyId: string, tripId?: string, supplierId?: string) {
    if (tripId) await findOwned(this.db.getRepository(Trip), tripId, agencyId, undefined, 'Trip');
    if (supplierId) await findOwned(this.db.getRepository(Supplier), supplierId, agencyId, undefined, 'Supplier');
  }
}
