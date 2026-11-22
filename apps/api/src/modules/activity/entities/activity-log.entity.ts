import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Agency } from '../../agencies/entities/agency.entity';

/** Append-only audit trail: who did what, on which record, inside which agency. */
@Entity('activity_logs')
@Index(['agencyId', 'createdAt'])
@Index(['agencyId', 'entityType', 'entityId'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  agencyId!: string;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency?: Relation<Agency>;

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User> | null;

  /** e.g. booking.created, payment.recorded */
  @Column({ length: 64 })
  action!: string;

  @Column({ length: 40 })
  entityType!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  entityId!: string | null;

  @Column({ length: 255 })
  summary!: string;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' })
  createdAt!: Date;
}
