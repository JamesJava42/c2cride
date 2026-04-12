import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';
import { ReportIncidentDto } from './dto/report-incident.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('actions')
  getActions() {
    return this.adminService.getActions();
  }

  @Get('incidents')
  getIncidents() {
    return this.adminService.getIncidents();
  }

  @Post('incidents')
  reportIncident(@CurrentUser() user: User, @Body() dto: ReportIncidentDto) {
    return this.adminService.reportIncident(user.id, dto.rideRequestId ?? null, dto.type, dto.description);
  }

  @Post('incidents/:id/resolve')
  resolveIncident(@Param('id') id: string) {
    return this.adminService.resolveIncident(id);
  }
}
