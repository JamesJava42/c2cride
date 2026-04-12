import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RideRequest } from './ride-request.entity.js';
import { Driver } from './driver.entity.js';
import { Vehicle } from './vehicle.entity.js';

export type AssignmentStatus = 'active' | 'cancelled' | 'completed' | 'reassigned' | 'expired';

@Entity('ride_assignments')
export class RideAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ride_request_id', type: 'uuid' })
  rideRequestId: string;

  @ManyToOne(() => RideRequest)
  @JoinColumn({ name: 'ride_request_id' })
  rideRequest: RideRequest;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({
    type: 'enum',
    enum: ['active', 'cancelled', 'completed', 'reassigned', 'expired'],
    default: 'active',
  })
  status: AssignmentStatus;

  @Column({ name: 'assignment_no', type: 'int', default: 1 })
  assignmentNo: number;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'pickup_arrived_at', type: 'timestamptz', nullable: true })
  pickupArrivedAt: Date | null;

  @Column({ name: 'trip_started_at', type: 'timestamptz', nullable: true })
  tripStartedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'ended_reason', type: 'text', nullable: true })
  endedReason: string | null;
}
