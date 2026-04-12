import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ZonesService } from './zones.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CreateZoneDto } from './dto/create-zone.dto.js';

@Controller('zones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  findAll() {
    return this.zonesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zonesService.findById(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateZoneDto) {
    return this.zonesService.create(dto);
  }

  @Post(':id/deactivate')
  @Roles('admin')
  deactivate(@Param('id') id: string) {
    return this.zonesService.deactivate(id);
  }
}
