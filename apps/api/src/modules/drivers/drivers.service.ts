import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../entities/driver.entity.js';
import { User } from '../../entities/user.entity.js';
import { CreateDriverProfileDto } from './dto/create-driver-profile.dto.js';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto.js';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async createProfile(userId: string, dto: CreateDriverProfileDto): Promise<Driver> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'driver') throw new ForbiddenException('Only driver-role users can create a driver profile');

    const existing = await this.drivers.findOne({ where: { id: userId } });
    if (existing) throw new ConflictException('Driver profile already exists');

    const driver = this.drivers.create({
      id: userId,
      licenseNumber: dto.licenseNumber,
      licenseState: dto.licenseState,
    });
    return this.drivers.save(driver);
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.drivers.findOne({ where: { id }, relations: ['user'] });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async findAll(): Promise<Driver[]> {
    return this.drivers.find({ relations: ['user'] });
  }

  async approve(id: string, adminId: string): Promise<Driver> {
    const driver = await this.findById(id);
    driver.approvalStatus = 'approved';
    driver.approvedAt = new Date();
    driver.approvedBy = adminId;
    return this.drivers.save(driver);
  }

  async reject(id: string): Promise<Driver> {
    const driver = await this.findById(id);
    driver.approvalStatus = 'rejected';
    return this.drivers.save(driver);
  }

  async suspend(id: string, reason: string): Promise<Driver> {
    const driver = await this.findById(id);
    driver.approvalStatus = 'suspended';
    driver.suspendedAt = new Date();
    driver.suspensionReason = reason;
    return this.drivers.save(driver);
  }

  async updateProfile(id: string, dto: UpdateDriverProfileDto): Promise<Driver> {
    const driver = await this.findById(id);
    if (dto.licenseNumber !== undefined) driver.licenseNumber = dto.licenseNumber;
    if (dto.licenseState !== undefined) driver.licenseState = dto.licenseState;
    return this.drivers.save(driver);
  }

  async updateReliabilityScore(id: string, delta: number): Promise<Driver> {
    const driver = await this.findById(id);
    const newScore = Math.max(0, Math.min(100, Number(driver.reliabilityScore) + delta));
    driver.reliabilityScore = newScore;
    return this.drivers.save(driver);
  }
}
