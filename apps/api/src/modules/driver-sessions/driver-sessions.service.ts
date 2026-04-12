import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DriverSession } from '../../entities/driver-session.entity.js';
import { Vehicle } from '../../entities/vehicle.entity.js';

@Injectable()
export class DriverSessionsService {
  constructor(
    @InjectRepository(DriverSession) private readonly sessions: Repository<DriverSession>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
  ) {}

  async goOnline(driverId: string, vehicleId: string): Promise<DriverSession> {
    const active = await this.sessions.findOne({
      where: { driverId, endedAt: IsNull() },
    });
    if (active) throw new ConflictException('Driver already has an active session');

    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId, driverId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const session = this.sessions.create({ driverId, vehicleId, isOnline: true });
    return this.sessions.save(session);
  }

  async goOffline(driverId: string): Promise<DriverSession> {
    const session = await this.sessions.findOne({
      where: { driverId, endedAt: IsNull() },
    });
    if (!session) throw new NotFoundException('No active session found');
    session.endedAt = new Date();
    session.isOnline = false;
    return this.sessions.save(session);
  }

  async heartbeat(driverId: string): Promise<void> {
    const session = await this.sessions.findOne({
      where: { driverId, endedAt: IsNull() },
    });
    if (!session) throw new NotFoundException('No active session found');
    session.lastSeenAt = new Date();
    await this.sessions.save(session);
  }

  async getActiveSession(driverId: string): Promise<DriverSession | null> {
    return this.sessions.findOne({
      where: { driverId, endedAt: IsNull() },
      relations: ['vehicle'],
    });
  }
}
