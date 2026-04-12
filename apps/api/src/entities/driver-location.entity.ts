import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Driver } from './driver.entity.js';

@Entity('driver_locations')
export class DriverLocation {
  @PrimaryColumn({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  // Stored as GEOGRAPHY(POINT,4326) — use raw SQL for spatial ops
  @Column({ type: 'text', nullable: true })
  coords: string | null;

  @Column({ type: 'numeric', nullable: true })
  heading: number | null;

  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'NOW()' })
  recordedAt: Date;
}
