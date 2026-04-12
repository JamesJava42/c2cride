import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceZone } from './service-zone.entity.js';

@Entity('fare_rules')
export class FareRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'zone_id', type: 'uuid', nullable: true })
  zoneId: string | null;

  @ManyToOne(() => ServiceZone, { nullable: true })
  @JoinColumn({ name: 'zone_id' })
  zone: ServiceZone | null;

  @Column({ name: 'base_fare', type: 'numeric', precision: 10, scale: 2 })
  baseFare: number;

  @Column({ name: 'per_mile', type: 'numeric', precision: 10, scale: 4 })
  perMile: number;

  @Column({ name: 'per_minute', type: 'numeric', precision: 10, scale: 4 })
  perMinute: number;

  @Column({ name: 'minimum_fare', type: 'numeric', precision: 10, scale: 2 })
  minimumFare: number;

  @Column({ name: 'pool_discount_pct', type: 'numeric', precision: 5, scale: 2, default: 0 })
  poolDiscountPct: number;

  @Column({ name: 'effective_from', type: 'timestamptz', default: () => 'NOW()' })
  effectiveFrom: Date;
}
