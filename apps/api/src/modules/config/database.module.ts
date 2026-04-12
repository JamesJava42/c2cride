import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity.js';
import { Driver } from '../../entities/driver.entity.js';
import { Vehicle } from '../../entities/vehicle.entity.js';
import { DriverDocument } from '../../entities/driver-document.entity.js';
import { DriverSession } from '../../entities/driver-session.entity.js';
import { DriverLocation } from '../../entities/driver-location.entity.js';
import { ServiceZone } from '../../entities/service-zone.entity.js';
import { FareRule } from '../../entities/fare-rule.entity.js';
import { RideRequest } from '../../entities/ride-request.entity.js';
import { RideAssignment } from '../../entities/ride-assignment.entity.js';
import { RideEvent } from '../../entities/ride-event.entity.js';
import { DriverOffer } from '../../entities/driver-offer.entity.js';
import { Payment } from '../../entities/payment.entity.js';
import { IncidentReport } from '../../entities/incident-report.entity.js';
import { AdminAction } from '../../entities/admin-action.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('DATABASE_HOST', 'localhost'),
        port: cfg.get<number>('DATABASE_PORT', 5432),
        database: cfg.get<string>('DATABASE_NAME', 'community_ride'),
        username: cfg.get<string>('DATABASE_USER', 'cr_user'),
        password: cfg.get<string>('DATABASE_PASSWORD', 'cr_dev_pass'),
        synchronize: false,
        logging: cfg.get('NODE_ENV') === 'development',
        entities: [
          User,
          Driver,
          Vehicle,
          DriverDocument,
          DriverSession,
          DriverLocation,
          ServiceZone,
          FareRule,
          RideRequest,
          RideAssignment,
          RideEvent,
          DriverOffer,
          Payment,
          IncidentReport,
          AdminAction,
        ],
      }),
    }),
  ],
})
export class DatabaseModule {}
