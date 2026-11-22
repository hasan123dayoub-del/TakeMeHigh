import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, MONEY_COLUMN } from '../../../common/entities/base.entity';
import { Supplier } from './supplier.entity';

@Entity('hotel_details')
export class HotelDetails extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 36 })
  supplierId!: string;

  @OneToOne(() => Supplier, (s) => s.hotel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Relation<Supplier>;

  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  starRating!: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  totalRooms!: number | null;

  /** Negotiated base rate per room per night. */
  @Column(MONEY_COLUMN)
  nightlyRate!: string;

  @Column({ type: 'simple-json', nullable: true })
  roomTypes!: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  amenities!: string[] | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  checkInTime!: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  checkOutTime!: string | null;
}
