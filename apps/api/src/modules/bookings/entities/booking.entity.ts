import { BOOKING_SOURCES, BOOKING_STATUSES, PAYMENT_STATUSES } from '@travelos/shared';
import type { BookingSource, BookingStatus, PaymentStatus } from '@travelos/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { MONEY_COLUMN } from '../../../common/entities/base.entity';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Trip } from '../../trips/entities/trip.entity';
import { User } from '../../users/entities/user.entity';
import { Payment } from '../../finance/entities/payment.entity';
import { Refund } from '../../finance/entities/refund.entity';
import { BookingPassenger } from './booking-passenger.entity';

@Entity('bookings')
@Index(['agencyId', 'reference'], { unique: true })
@Index(['agencyId', 'status', 'createdAt'])
@Index(['agencyId', 'paymentStatus'])
@Index(['tripId', 'status'])
@Index(['customerId'])
export class Booking extends TenantEntity {
  /** Human friendly reference shown to customers, e.g. TOS-26-4KQ7ZD */
  @Column({ length: 20 })
  reference!: string;

  @Column({ type: 'varchar', length: 36 })
  tripId!: string;

  @ManyToOne(() => Trip, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip>;

  @Column({ type: 'varchar', length: 36 })
  customerId!: string;

  @ManyToOne(() => Customer, (c) => c.bookings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Relation<Customer>;

  @Column({ type: 'enum', enum: [...BOOKING_STATUSES], default: 'PENDING' })
  status!: BookingStatus;

  @Column({ type: 'enum', enum: [...BOOKING_SOURCES], default: 'OFFICE' })
  source!: BookingSource;

  @Column({ type: 'smallint', unsigned: true })
  adults!: number;

  @Column({ type: 'smallint', unsigned: true, default: 0 })
  children!: number;

  /** Seats this booking holds on the trip (adults + children). */
  @Column({ type: 'smallint', unsigned: true })
  seats!: number;

  @Column(MONEY_COLUMN)
  unitPrice!: string;

  @Column(MONEY_COLUMN)
  childUnitPrice!: string;

  @Column(MONEY_COLUMN)
  subtotal!: string;

  @Column(MONEY_COLUMN)
  discount!: string;

  @Column(MONEY_COLUMN)
  totalAmount!: string;

  /** Sum of payments minus refunds. Maintained in the same transaction as each payment/refund. */
  @Column(MONEY_COLUMN)
  paidAmount!: string;

  @Column(MONEY_COLUMN)
  refundedAmount!: string;

  @Column({ type: 'enum', enum: [...PAYMENT_STATUSES], default: 'UNPAID' })
  paymentStatus!: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'text', nullable: true })
  specialRequests!: string | null;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationReason!: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: Relation<User> | null;

  @OneToMany(() => BookingPassenger, (p) => p.booking, { cascade: true })
  passengers?: Relation<BookingPassenger[]>;

  @OneToMany(() => Payment, (p) => p.booking)
  payments?: Relation<Payment[]>;

  @OneToMany(() => Refund, (r) => r.booking)
  refunds?: Relation<Refund[]>;
}
