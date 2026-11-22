import { Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from './base.entity';
import { Agency } from '../../modules/agencies/entities/agency.entity';

/**
 * Every operational row belongs to exactly one agency (tenant).
 * Services always filter by agencyId taken from the verified JWT, never from the request body.
 */
export abstract class TenantEntity extends AppBaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 36 })
  agencyId!: string;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency?: Relation<Agency>;
}
