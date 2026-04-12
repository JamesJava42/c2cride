import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZonesService } from './zones.service.js';
import { ZonesController } from './zones.controller.js';
import { ServiceZone } from '../../entities/service-zone.entity.js';
import { FareRule } from '../../entities/fare-rule.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceZone, FareRule])],
  providers: [ZonesService],
  controllers: [ZonesController],
  exports: [ZonesService],
})
export class ZonesModule {}
