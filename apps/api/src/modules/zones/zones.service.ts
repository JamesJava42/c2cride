import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceZone } from '../../entities/service-zone.entity.js';
import { FareRule } from '../../entities/fare-rule.entity.js';
import { CreateZoneDto } from './dto/create-zone.dto.js';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(ServiceZone) private readonly zones: Repository<ServiceZone>,
    @InjectRepository(FareRule) private readonly fareRules: Repository<FareRule>,
  ) {}

  async findAll(): Promise<ServiceZone[]> {
    return this.zones.find({ where: { active: true } });
  }

  async findById(id: string): Promise<ServiceZone> {
    const zone = await this.zones.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  async create(dto: CreateZoneDto): Promise<ServiceZone> {
    const zone = this.zones.create({
      name: dto.name,
      minFare: dto.minFare ?? 0,
      active: true,
    });
    return this.zones.save(zone);
  }

  async deactivate(id: string): Promise<ServiceZone> {
    const zone = await this.findById(id);
    zone.active = false;
    return this.zones.save(zone);
  }

  async getActiveFareRule(zoneId: string | null): Promise<FareRule | null> {
    const query = this.fareRules
      .createQueryBuilder('fr')
      .where('fr.effective_from <= NOW()');
    if (zoneId) {
      query.andWhere('(fr.zone_id = :zoneId OR fr.zone_id IS NULL)', { zoneId });
    } else {
      query.andWhere('fr.zone_id IS NULL');
    }
    query.orderBy('fr.effective_from', 'DESC').limit(1);
    return query.getOne();
  }

  async estimateFare(
    distanceMiles: number,
    durationMinutes: number,
    zoneId: string | null,
  ): Promise<{ estimate: number; rule: FareRule | null }> {
    const rule = await this.getActiveFareRule(zoneId);
    if (!rule) return { estimate: 0, rule: null };

    const raw =
      Number(rule.baseFare) +
      Number(rule.perMile) * distanceMiles +
      Number(rule.perMinute) * durationMinutes;
    const estimate = Math.max(Number(rule.minimumFare), raw);
    return { estimate: Math.round(estimate * 100) / 100, rule };
  }
}
