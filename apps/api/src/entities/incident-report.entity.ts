import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RideRequest } from './ride-request.entity.js';
import { User } from './user.entity.js';

@Entity('incident_reports')
export class IncidentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ride_request_id', type: 'uuid', nullable: true })
  rideRequestId: string | null;

  @ManyToOne(() => RideRequest, { nullable: true })
  @JoinColumn({ name: 'ride_request_id' })
  rideRequest: RideRequest | null;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ type: 'text' })
  type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', default: 'open' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
