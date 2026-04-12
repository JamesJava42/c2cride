import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversService } from './drivers.service.js';
import { DriversController } from './drivers.controller.js';
import { Driver } from '../../entities/driver.entity.js';
import { User } from '../../entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, User])],
  providers: [DriversService],
  controllers: [DriversController],
  exports: [DriversService],
})
export class DriversModule {}
