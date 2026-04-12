import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { ServiceZone } from './service-zone.entity.js';

export type RideStatus =
  | 'draft'
  | 'scheduled'
  | 'requested'
  | 'searching_driver'
  | 'offer_pending'
  | 'driver_accepted'
  | 'driver_enroute_pickup'
  | 'driver_arrived'
  | 'rider_checked_in'
  | 'trip_in_progress'
  | 'completed'
  | 'admin_queue'
  | 'reassigning_driver'
  | 'cancelled_by_rider'
  | 'cancelled_by_driver'
  | 'cancelled_by_admin'
  | 'rider_no_show'
  | 'driver_no_show'
  | 'expired_unassigned';

@Entity('ride_requests')
export class RideRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rider_id', type: 'uuid' })
  riderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'rider_id' })
  rider: User;

  @Column({ name: 'rider_name_snapshot', type: 'text' })
  riderNameSnapshot: string;

  @Column({ name: 'rider_phone_snapshot', type: 'text' })
  riderPhoneSnapshot: string;

  // GEOGRAPHY(POINT,4326) stored as text; spatial ops use raw SQL
  @Column({ name: 'pickup_coords', type: 'text', nullable: true })
  pickupCoords: string | null;

  @Column({ name: 'drop_coords', type: 'text', nullable: true })
  dropCoords: string | null;

  @Column({ name: 'pickup_address', type: 'text' })
  pickupAddress: string;

  @Column({ name: 'drop_address', type: 'text' })
  dropAddress: string;

  @Column({ name: 'passenger_count', type: 'int' })
  passengerCount: number;

  @Column({
    type: 'enum',
    enum: [
      'draft','scheduled','requested','searching_driver','offer_pending',
      'driver_accepted','driver_enroute_pickup','driver_arrived',
      'rider_checked_in','trip_in_progress','completed',
      'admin_queue','reassigning_driver',
      'cancelled_by_rider','cancelled_by_driver','cancelled_by_admin',
      'rider_no_show','driver_no_show','expired_unassigned',
    ],
    default: 'draft',
  })
  status: RideStatus;

  @Column({ name: 'state_version', type: 'int', default: 0 })
  stateVersion: number;

  @Column({ name: 'fare_estimate', type: 'numeric', precision: 10, scale: 2, nullable: true })
  fareEstimate: number | null;

  @Column({ name: 'fare_final', type: 'numeric', precision: 10, scale: 2, nullable: true })
  fareFinal: number | null;

  @Column({ name: 'estimated_distance_miles', type: 'numeric', precision: 8, scale: 3, nullable: true })
  estimatedDistanceMiles: number | null;

  @Column({ name: 'estimated_duration_minutes', type: 'numeric', precision: 8, scale: 1, nullable: true })
  estimatedDurationMinutes: number | null;

  @Column({ name: 'quoted_base_fare', type: 'numeric', precision: 10, scale: 2, nullable: true })
  quotedBaseFare: number | null;

  @Column({ name: 'quoted_rate_snapshot', type: 'jsonb', nullable: true })
  quotedRateSnapshot: object | null;

  @Column({ name: 'otp_code_hash', type: 'text', nullable: true })
  otpCodeHash: string | null;

  @Column({ name: 'otp_generated_at', type: 'timestamptz', nullable: true })
  otpGeneratedAt: Date | null;

  @Column({ name: 'otp_attempt_count', type: 'int', default: 0 })
  otpAttemptCount: number;

  @Column({ name: 'zone_id', type: 'uuid', nullable: true })
  zoneId: string | null;

  @ManyToOne(() => ServiceZone, { nullable: true })
  @JoinColumn({ name: 'zone_id' })
  zone: ServiceZone | null;

  @CreateDateColumn({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}
