import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { Agency } from './agency.entity';

@Entity('agency_settings')
export class AgencySettings extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 36 })
  agencyId!: string;

  @OneToOne(() => Agency, (a) => a.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency?: Relation<Agency>;

  @Column({ default: false })
  publicPageEnabled!: boolean;

  @Column({ type: 'varchar', length: 160, nullable: true })
  publicTagline!: string | null;

  @Column({ type: 'text', nullable: true })
  publicDescription!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  heroImageUrl!: string | null;

  @Column({ length: 9, default: '#0F766E' })
  brandColor!: string;

  /** Default deposit asked when a booking is confirmed, in percent. */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: '30.00' })
  depositPercent!: string;

  @Column({ type: 'smallint', default: 7 })
  balanceDueDaysBeforeDeparture!: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  whatsappNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  bookingTerms!: string | null;
}
