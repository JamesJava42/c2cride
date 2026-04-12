import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispatchService } from './dispatch.service.js';
import { DispatchController } from './dispatch.controller.js';
import { DriverOffer } from '../../entities/driver-offer.entity.js';
import { RideRequest } from '../../entities/ride-request.entity.js';
import { RideAssignment } from '../../entities/ride-assignment.entity.js';
import { Driver } from '../../entities/driver.entity.js';
import { DriverSession } from '../../entities/driver-session.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverOffer, RideRequest, RideAssignment, Driver, DriverSession]),
  ],
  providers: [DispatchService],
  controllers: [DispatchController],
  exports: [DispatchService],
})
export class DispatchModule {}
