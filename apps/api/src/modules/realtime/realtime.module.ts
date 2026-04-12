import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway.js';
import { DriverLocation } from '../../entities/driver-location.entity.js';
import { DriverSession } from '../../entities/driver-session.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverLocation, DriverSession]),
    JwtModule.register({}),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
