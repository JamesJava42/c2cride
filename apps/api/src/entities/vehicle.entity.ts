import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity.js';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'text' })
  make: string;

  @Column({ type: 'text' })
  model: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'text', unique: true })
  plate: string;

  @Column({ type: 'text' })
  color: string;

  @Column({ name: 'seat_capacity', type: 'int' })
  seatCapacity: number;

  @Column({ name: 'insurance_expiry', type: 'date' })
  insuranceExpiry: string;
}
