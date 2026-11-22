import { Column, Entity, Index, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('customers')
@Index(['agencyId', 'lastName', 'firstName'])
@Index(['agencyId', 'phone'])
@Index(['agencyId', 'email'])
export class Customer extends TenantEntity {
  @Column({ length: 80 })
  firstName!: string;

  @Column({ length: 80 })
  lastName!: string;

  @Column({ type: 'varchar', length: 190, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  nationality!: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: string | null;

  /** Sensitive: masked in list responses; full value only for roles allowed to write customers. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  passportNumber!: string | null;

  @Column({ type: 'date', nullable: true })
  passportExpiry!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  tags!: string[] | null;

  @OneToMany(() => Booking, (b) => b.customer)
  bookings?: Relation<Booking[]>;
}
