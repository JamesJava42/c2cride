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

export type OfferResponse = 'pending' | 'accepted' | 'declined' | 'expired';

@Entity('driver_offers')
export class DriverOffer {
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

  @Column({ name: 'attempt_no', type: 'int' })
  attemptNo: number;

  @CreateDateColumn({ name: 'offered_at', type: 'timestamptz' })
  offeredAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending',
  })
  response: OfferResponse;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @Column({ name: 'expired_reason', type: 'text', nullable: true })
  expiredReason: string | null;
}
