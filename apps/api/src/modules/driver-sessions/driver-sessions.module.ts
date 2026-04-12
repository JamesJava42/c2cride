import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverSessionsService } from './driver-sessions.service.js';
import { DriverSessionsController } from './driver-sessions.controller.js';
import { DriverSession } from '../../entities/driver-session.entity.js';
import { Vehicle } from '../../entities/vehicle.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([DriverSession, Vehicle])],
  providers: [DriverSessionsService],
  controllers: [DriverSessionsController],
  exports: [DriverSessionsService],
})
export class DriverSessionsModule {}
