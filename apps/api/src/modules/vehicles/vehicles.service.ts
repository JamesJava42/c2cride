import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../entities/vehicle.entity.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
  ) {}

  async create(driverId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehicles.create({ ...dto, driverId });
    return this.vehicles.save(vehicle);
  }

  async findByDriver(driverId: string): Promise<Vehicle[]> {
    return this.vehicles.find({ where: { driverId } });
  }

  async findById(id: string): Promise<Vehicle> {
    const v = await this.vehicles.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  async remove(id: string, driverId: string): Promise<void> {
    const v = await this.findById(id);
    if (v.driverId !== driverId) throw new NotFoundException('Vehicle not found');
    await this.vehicles.remove(v);
  }
}
