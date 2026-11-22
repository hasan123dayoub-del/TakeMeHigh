import { TRIP_STATUSES } from '@travelos/shared';
import type { TripStatus } from '@travelos/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { MONEY_COLUMN } from '../../../common/entities/base.entity';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { Destination } from './destination.entity';
import { TripItinerary } from './trip-itinerary.entity';
import { TripSupplier } from '../../suppliers/entities/trip-supplier.entity';

@Entity('trips')
@Index(['agencyId', 'code'], { unique: true })
@Index(['agencyId', 'departureDate'])
@Index(['agencyId', 'status'])
// CHECK constraints (seats_booked <= capacity, return >= departure) live in the InitialSchema migration.
export class Trip extends TenantEntity {
  @Column({ length: 20 })
  code!: string;

  @Column({ length: 160 })
  title!: string;

  @Column({ length: 180 })
  slug!: string;

  @Column({ type: 'varchar', length: 36 })
  destinationId!: string;

  @ManyToOne(() => Destination, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'destination_id' })
  destination?: Relation<Destination>;

  @Column({ type: 'varchar', length: 300, nullable: true })
  summary!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'date' })
  departureDate!: string;

  @Column({ type: 'date' })
  returnDate!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  departureLocation!: string | null;

  @Column({ type: 'int', unsigned: true })
  capacity!: number;

  /** Seats held by PENDING + CONFIRMED bookings. Only changed through an atomic conditional UPDATE. */
  @Column({ type: 'int', unsigned: true, default: 0 })
  seatsBooked!: number;

  @Column(MONEY_COLUMN)
  pricePerPerson!: string;

  @Column({ ...MONEY_COLUMN, nullable: true, default: null })
  childPrice!: string | null;

  /** Estimated cost per traveller, used for margin reporting. */
  @Column(MONEY_COLUMN)
  costPerPerson!: string;

  @Column({ type: 'enum', enum: [...TRIP_STATUSES], default: 'DRAFT' })
  status!: TripStatus;

  /** Listed on the agency's optional public page. */
  @Column({ default: false })
  isPublic!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  inclusions!: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  exclusions!: string[] | null;

  @OneToMany(() => TripItinerary, (i) => i.trip, { cascade: true })
  itinerary?: Relation<TripItinerary[]>;

  @OneToMany(() => TripSupplier, (s) => s.trip)
  suppliers?: Relation<TripSupplier[]>;
}
