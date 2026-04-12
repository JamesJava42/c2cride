import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('service_zones')
export class ServiceZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  // GEOGRAPHY(POLYGON,4326) — spatial ops via raw SQL
  @Column({ type: 'text', nullable: true })
  polygon: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'min_fare', type: 'numeric', precision: 10, scale: 2, default: 0 })
  minFare: number;
}
