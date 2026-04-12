import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { AdminAction } from '../../entities/admin-action.entity.js';
import { IncidentReport } from '../../entities/incident-report.entity.js';
import { User } from '../../entities/user.entity.js';
import { Driver } from '../../entities/driver.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AdminAction, IncidentReport, User, Driver])],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
