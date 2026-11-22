import { SUPPLIER_TYPES } from '@travelos/shared';
import type { SupplierType } from '@travelos/shared';
import { Column, Entity, Index, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { TenantEntity } from '../../../common/entities/tenant.entity';
import { HotelDetails } from './hotel-details.entity';
import { TransportationDetails } from './transportation-details.entity';

@Entity('suppliers')
@Index(['agencyId', 'type'])
@Index(['agencyId', 'name'])
export class Supplier extends TenantEntity {
  @Column({ type: 'enum', enum: [...SUPPLIER_TYPES] })
  type!: SupplierType;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  contactName!: string | null;

  @Column({ type: 'varchar', length: 190, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  /** Internal quality rating 1-5. */
  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  rating!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @OneToOne(() => HotelDetails, (h) => h.supplier, { cascade: true })
  hotel?: Relation<HotelDetails> | null;

  @OneToOne(() => TransportationDetails, (t) => t.supplier, { cascade: true })
  transport?: Relation<TransportationDetails> | null;
}
