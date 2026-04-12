import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesService } from './rides.service.js';
import { RidesController } from './rides.controller.js';
import { RideRequest } from '../../entities/ride-request.entity.js';
import { RideEvent } from '../../entities/ride-event.entity.js';
import { RideAssignment } from '../../entities/ride-assignment.entity.js';
import { ZonesModule } from '../zones/zones.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RideRequest, RideEvent, RideAssignment]),
    ZonesModule,
  ],
  providers: [RidesService],
  controllers: [RidesController],
  exports: [RidesService],
})
export class RidesModule {}
