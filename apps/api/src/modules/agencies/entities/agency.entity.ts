import { Column, Entity, Index, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { AgencySettings } from './agency-settings.entity';

@Entity('agencies')
export class Agency extends AppBaseEntity {
  @Column({ length: 150 })
  name!: string;

  /** Used for the optional public booking page: /a/{slug} */
  @Index({ unique: true })
  @Column({ length: 80 })
  slug!: string;

  @Column({ type: 'varchar', length: 190, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string | null;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ length: 64, default: 'UTC' })
  timezone!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  licenseNumber!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @OneToOne(() => AgencySettings, (s) => s.agency)
  settings?: Relation<AgencySettings>;
}
