import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RideRequest } from './ride-request.entity.js';

export type PaymentStatus = 'pending' | 'manual' | 'captured' | 'refunded';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ride_request_id', type: 'uuid' })
  rideRequestId: string;

  @ManyToOne(() => RideRequest)
  @JoinColumn({ name: 'ride_request_id' })
  rideRequest: RideRequest;

  @Column({ name: 'amount_authorized', type: 'numeric', precision: 10, scale: 2, nullable: true })
  amountAuthorized: number | null;

  @Column({ name: 'amount_captured', type: 'numeric', precision: 10, scale: 2, nullable: true })
  amountCaptured: number | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'manual', 'captured', 'refunded'],
    default: 'pending',
  })
  status: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  provider: string | null;

  @Column({ name: 'provider_ref', type: 'text', nullable: true })
  providerRef: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
