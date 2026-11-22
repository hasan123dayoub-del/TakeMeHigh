import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { MONEY_COLUMN } from '../../../common/entities/base.entity';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { Trip } from '../../trips/entities/trip.entity';
import { Supplier } from './supplier.entity';

/** A service a supplier provides for a specific trip (hotel nights, coach days, guide...). */
@Entity('trip_suppliers')
@Index(['tripId'])
@Index(['supplierId'])
export class TripSupplier extends TenantEntity {
  @Column({ type: 'varchar', length: 36 })
  tripId!: string;

  @ManyToOne(() => Trip, (t) => t.suppliers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip?: Relation<Trip>;

  @Column({ type: 'varchar', length: 36 })
  supplierId!: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Relation<Supplier>;

  @Column({ length: 200 })
  service!: string;

  @Column({ type: 'int', unsigned: true, default: 1 })
  quantity!: number;

  @Column(MONEY_COLUMN)
  unitCost!: string;

  @Column(MONEY_COLUMN)
  totalCost!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
