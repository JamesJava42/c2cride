import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import type { RideRequest, RideStatus } from './ride-request.entity.js';

export type ActorRole = 'rider' | 'driver' | 'admin' | 'system';

@Entity('ride_events')
export class RideEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ride_request_id', type: 'uuid' })
  rideRequestId: string;

  @ManyToOne('RideRequest')
  @JoinColumn({ name: 'ride_request_id' })
  rideRequest: RideRequest;

  @Column({ name: 'event_type', type: 'text' })
  eventType: string;

  @Column({ name: 'previous_state', type: 'text', nullable: true })
  previousState: string | null;

  @Column({ name: 'new_state', type: 'text' })
  newState: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({
    name: 'actor_role',
    type: 'enum',
    enum: ['rider', 'driver', 'admin', 'system'],
  })
  actorRole: ActorRole;

  @Column({ type: 'jsonb', nullable: true })
  metadata: object | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
