import { Column, Entity, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/tenant.entity';

@Entity('destinations')
@Index(['agencyId', 'name'], { unique: true })
export class Destination extends TenantEntity {
  @Column({ length: 120 })
  name!: string;

  @Column({ length: 100 })
  country!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;
}
