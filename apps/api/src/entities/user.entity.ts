import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Check,
} from 'typeorm';

export type UserRole = 'rider' | 'driver' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'archived';

@Entity('users')
@Check(`"email" ~* '^[^@]+@[^@]+\\.[^@]+$'`)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text' })
  phone: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ type: 'enum', enum: ['rider', 'driver', 'admin'] })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: ['active', 'suspended', 'archived'],
    default: 'active',
  })
  status: UserStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
