import { PAYMENT_METHODS } from '@travelos/shared';
import type { PaymentMethod } from '@travelos/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { MONEY_COLUMN } from '../../../common/entities/base.entity';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';

@Entity('refunds')
@Index(['agencyId', 'refundedAt'])
@Index(['bookingId'])
export class Refund extends TenantEntity {
  @Column({ type: 'varchar', length: 36 })
  bookingId!: string;

  @ManyToOne(() => Booking, (b) => b.refunds, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column(MONEY_COLUMN)
  amount!: string;

  @Column({ type: 'enum', enum: [...PAYMENT_METHODS] })
  method!: PaymentMethod;

  @Column({ length: 255 })
  reason!: string;

  @Column({ type: 'datetime' })
  refundedAt!: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  processedById!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy?: Relation<User> | null;
}
