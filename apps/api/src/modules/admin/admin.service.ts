import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAction } from '../../entities/admin-action.entity.js';
import { IncidentReport } from '../../entities/incident-report.entity.js';
import { User } from '../../entities/user.entity.js';
import { Driver } from '../../entities/driver.entity.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminAction) private readonly actions: Repository<AdminAction>,
    @InjectRepository(IncidentReport) private readonly incidents: Repository<IncidentReport>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
  ) {}

  async logAction(
    adminId: string,
    targetType: string,
    targetId: string,
    action: string,
    reason?: string,
  ): Promise<AdminAction> {
    const record = this.actions.create({ adminId, targetType, targetId, action, reason: reason ?? null });
    return this.actions.save(record);
  }

  async getActions(): Promise<AdminAction[]> {
    return this.actions.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  async reportIncident(
    reporterId: string,
    rideRequestId: string | null,
    type: string,
    description: string,
  ): Promise<IncidentReport> {
    const report = this.incidents.create({
      reporterId,
      rideRequestId,
      type,
      description,
    });
    return this.incidents.save(report);
  }

  async getIncidents(): Promise<IncidentReport[]> {
    return this.incidents.find({
      order: { createdAt: 'DESC' },
      relations: ['reporter'],
    });
  }

  async resolveIncident(id: string): Promise<IncidentReport> {
    const report = await this.incidents.findOneOrFail({ where: { id } });
    report.status = 'resolved';
    return this.incidents.save(report);
  }

  async getDashboardStats(): Promise<Record<string, number>> {
    const [totalUsers, totalDrivers, pendingDrivers] = await Promise.all([
      this.users.count(),
      this.drivers.count(),
      this.drivers.count({ where: { approvalStatus: 'pending' } }),
    ]);
    return { totalUsers, totalDrivers, pendingDrivers };
  }
}
