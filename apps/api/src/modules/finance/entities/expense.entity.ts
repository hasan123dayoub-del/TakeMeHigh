import { EXPENSE_CATEGORIES } from '@travelos/shared';
import type { ExpenseCategory } from '@travelos/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { MONEY_COLUMN } from '../../../common/entities/base.entity';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { Trip } from '../../trips/entities/trip.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';

@Entity('expenses')
@Index(['agencyId', 'expenseDate'])
@Index(['agencyId', 'category'])
@Index(['tripId'])
export class Expense extends TenantEntity {
  @Column({ type: 'enum', enum: [...EXPENSE_CATEGORIES] })
  category!: ExpenseCategory;

  @Column({ length: 200 })
  description!: string;

  @Column(MONEY_COLUMN)
  amount!: string;

  @Column({ type: 'date' })
  expenseDate!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  reference!: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tripId!: string | null;

  @ManyToOne(() => Trip, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip> | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  supplierId!: string | null;

  @ManyToOne(() => Supplier, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Relation<Supplier> | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: Relation<User> | null;
}
