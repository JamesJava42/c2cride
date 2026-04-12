import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DriversService } from './drivers.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';
import { CreateDriverProfileDto } from './dto/create-driver-profile.dto.js';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto.js';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post('profile')
  @Roles('driver')
  createProfile(@CurrentUser() user: User, @Body() dto: CreateDriverProfileDto) {
    return this.driversService.createProfile(user.id, dto);
  }

  @Get('me')
  @Roles('driver')
  getMyProfile(@CurrentUser() user: User) {
    return this.driversService.findById(user.id);
  }

  @Patch('profile')
  @Roles('driver')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateDriverProfileDto) {
    return this.driversService.updateProfile(user.id, dto);
  }

  @Get()
  @Roles('admin')
  findAll() {
    return this.driversService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Post(':id/approve')
  @Roles('admin')
  approve(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.driversService.approve(id, admin.id);
  }

  @Post(':id/reject')
  @Roles('admin')
  reject(@Param('id') id: string) {
    return this.driversService.reject(id);
  }
}
