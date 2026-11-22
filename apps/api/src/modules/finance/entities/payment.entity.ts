import { PAYMENT_METHODS } from '@travelos/shared';
import type { PaymentMethod } from '@travelos/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { MONEY_COLUMN } from '../../../common/entities/base.entity';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';

@Entity('payments')
@Index(['agencyId', 'paidAt'])
@Index(['bookingId'])
export class Payment extends TenantEntity {
  @Column({ type: 'varchar', length: 36 })
  bookingId!: string;

  @ManyToOne(() => Booking, (b) => b.payments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column(MONEY_COLUMN)
  amount!: string;

  @Column({ type: 'enum', enum: [...PAYMENT_METHODS] })
  method!: PaymentMethod;

  @Column({ default: false })
  isDeposit!: boolean;

  /** Receipt / transfer reference. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  reference!: string | null;

  @Column({ type: 'datetime' })
  paidAt!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  receivedById!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'received_by_id' })
  receivedBy?: Relation<User> | null;
}
