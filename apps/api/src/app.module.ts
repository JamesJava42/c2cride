import { Module } from '@nestjs/common';
import { AppConfigModule } from './modules/config/config.module.js';
import { DatabaseModule } from './modules/config/database.module.js';
import { AppRedisModule } from './modules/config/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { DriversModule } from './modules/drivers/drivers.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { DriverSessionsModule } from './modules/driver-sessions/driver-sessions.module.js';
import { ZonesModule } from './modules/zones/zones.module.js';
import { RidesModule } from './modules/rides/rides.module.js';
import { DispatchModule } from './modules/dispatch/dispatch.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AppRedisModule,
    AuthModule,
    UsersModule,
    DriversModule,
    VehiclesModule,
    DriverSessionsModule,
    ZonesModule,
    RidesModule,
    DispatchModule,
    RealtimeModule,
    AdminModule,
  ],
})
export class AppModule {}
