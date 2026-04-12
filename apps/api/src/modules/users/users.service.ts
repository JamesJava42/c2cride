import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.name) user.name = dto.name;
    if (dto.phone) user.phone = dto.phone;
    return this.users.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.users.find({ order: { createdAt: 'DESC' } });
  }

  async suspend(id: string): Promise<User> {
    const user = await this.findById(id);
    user.status = 'suspended';
    return this.users.save(user);
  }

  async archive(id: string): Promise<User> {
    const user = await this.findById(id);
    user.status = 'archived';
    return this.users.save(user);
  }

  async activate(id: string): Promise<User> {
    const user = await this.findById(id);
    user.status = 'active';
    return this.users.save(user);
  }
}
