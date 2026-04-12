import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity.js';

export type DriverApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type BackgroundCheckStatus = 'pending' | 'clear' | 'failed';

@Entity('drivers')
export class Driver {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'id' })
  user: User;

  @Column({ name: 'license_number', type: 'text' })
  licenseNumber: string;

  @Column({ name: 'license_state', type: 'text' })
  licenseState: string;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  })
  approvalStatus: DriverApprovalStatus;

  @Column({ name: 'documents_complete', type: 'boolean', default: false })
  documentsComplete: boolean;

  @Column({
    name: 'background_check_status',
    type: 'enum',
    enum: ['pending', 'clear', 'failed'],
    default: 'pending',
  })
  backgroundCheckStatus: BackgroundCheckStatus;

  @Column({
    name: 'reliability_score',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 100,
  })
  reliabilityScore: number;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  @Column({ name: 'suspension_reason', type: 'text', nullable: true })
  suspensionReason: string | null;

  @Column({ name: 'background_check_completed_at', type: 'timestamptz', nullable: true })
  backgroundCheckCompletedAt: Date | null;

  @Column({ name: 'insurance_verified_at', type: 'timestamptz', nullable: true })
  insuranceVerifiedAt: Date | null;
}
