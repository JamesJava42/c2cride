import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DriverSessionsService } from './driver-sessions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';
import { IsString } from 'class-validator';

class GoOnlineDto {
  @IsString()
  vehicleId: string;
}

@Controller('driver-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('driver')
export class DriverSessionsController {
  constructor(private readonly sessionsService: DriverSessionsService) {}

  @Post('online')
  goOnline(@CurrentUser() user: User, @Body() dto: GoOnlineDto) {
    return this.sessionsService.goOnline(user.id, dto.vehicleId);
  }

  @Post('offline')
  goOffline(@CurrentUser() user: User) {
    return this.sessionsService.goOffline(user.id);
  }

  @Post('heartbeat')
  heartbeat(@CurrentUser() user: User) {
    return this.sessionsService.heartbeat(user.id);
  }

  @Get('active')
  getActive(@CurrentUser() user: User) {
    return this.sessionsService.getActiveSession(user.id);
  }
}
