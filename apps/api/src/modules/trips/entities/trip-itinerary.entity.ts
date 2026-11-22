import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { Trip } from './trip.entity';

@Entity('trip_itineraries')
@Index(['tripId', 'dayNumber'], { unique: true })
export class TripItinerary extends TenantEntity {
  @Column({ type: 'varchar', length: 36 })
  tripId!: string;

  @ManyToOne(() => Trip, (t) => t.itinerary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip>;

  @Column({ type: 'smallint', unsigned: true })
  dayNumber!: number;

  @Column({ length: 160 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location!: string | null;
}
