import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, MONEY_COLUMN } from '../../../common/entities/base.entity';
import { Supplier } from './supplier.entity';

export const VEHICLE_TYPES = ['COACH', 'MINIBUS', 'VAN', 'CAR', 'FLIGHT', 'FERRY', 'TRAIN'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

@Entity('transportation_details')
export class TransportationDetails extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 36 })
  supplierId!: string;

  @OneToOne(() => Supplier, (s) => s.transport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Relation<Supplier>;

  @Column({ type: 'enum', enum: [...VEHICLE_TYPES], default: 'COACH' })
  vehicleType!: VehicleType;

  @Column({ type: 'int', unsigned: true, nullable: true })
  fleetSize!: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  seatsPerVehicle!: number | null;

  /** Negotiated base rate per vehicle per day. */
  @Column(MONEY_COLUMN)
  dailyRate!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  licenseNumber!: string | null;
}
