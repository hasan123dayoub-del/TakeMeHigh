import { ROLES } from '@travelos/shared';
import type { Role } from '@travelos/shared';
import { Column, Entity, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/tenant.entity';

@Entity('users')
export class User extends TenantEntity {
  @Column({ length: 120 })
  fullName!: string;

  /** Login identifier, unique across the platform. */
  @Index({ unique: true })
  @Column({ length: 190 })
  email!: string;

  @Column({ length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: [...ROLES], default: 'BOOKING_AGENT' })
  role!: Role;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt!: Date | null;
}
