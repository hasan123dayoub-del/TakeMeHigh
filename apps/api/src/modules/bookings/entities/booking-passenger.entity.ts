import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { Booking } from './booking.entity';

export const PASSENGER_TYPES = ['ADULT', 'CHILD'] as const;
export type PassengerType = (typeof PASSENGER_TYPES)[number];

@Entity('booking_passengers')
@Index(['bookingId'])
export class BookingPassenger extends TenantEntity {
  @Column({ type: 'varchar', length: 36 })
  bookingId!: string;

  @ManyToOne(() => Booking, (b) => b.passengers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column({ length: 160 })
  fullName!: string;

  @Column({ type: 'enum', enum: [...PASSENGER_TYPES], default: 'ADULT' })
  type!: PassengerType;

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  passportNumber!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  nationality!: string | null;
}
