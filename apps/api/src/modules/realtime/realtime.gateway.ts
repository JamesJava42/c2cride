import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DriverLocation } from '../../entities/driver-location.entity.js';
import { DriverSession } from '../../entities/driver-session.entity.js';

interface LocationPayload {
  lat: number;
  lng: number;
  heading?: number;
}

const DRIVER_LOCATION_KEY = (driverId: string) => `driver_location:${driverId}`;

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly socketUserMap = new Map<string, { userId: string; role: string }>();

  constructor(
    @InjectRepository(DriverLocation) private readonly driverLocations: Repository<DriverLocation>,
    @InjectRepository(DriverSession) private readonly sessions: Repository<DriverSession>,
    @InjectRedis() private readonly redis: Redis,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = this.jwt.verify<{ sub: string; role: string }>(token, {
        secret: this.cfg.get<string>('JWT_SECRET'),
      });

      this.socketUserMap.set(socket.id, { userId: payload.sub, role: payload.role });
      socket.join(`user:${payload.sub}`);
      if (payload.role === 'driver') socket.join('drivers');
      if (payload.role === 'admin') socket.join('admins');

      this.logger.log(`Socket connected: ${socket.id} (user ${payload.sub})`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket): void {
    this.socketUserMap.delete(socket.id);
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: LocationPayload,
  ): Promise<void> {
    const user = this.socketUserMap.get(socket.id);
    if (!user || user.role !== 'driver') return;

    const { lat, lng, heading } = payload;

    // Cache in Redis (fast reads for dispatch)
    const ttl = this.cfg.get<number>('HEARTBEAT_TTL_SECONDS', 45);
    await this.redis.setex(
      DRIVER_LOCATION_KEY(user.userId),
      ttl,
      JSON.stringify({ lat, lng, heading, ts: Date.now() }),
    );

    // Upsert in PostGIS using raw SQL
    await this.driverLocations.query(
      `INSERT INTO driver_locations (driver_id, coords, heading, recorded_at)
       VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $4, NOW())
       ON CONFLICT (driver_id) DO UPDATE
       SET coords = ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
           heading = $4,
           recorded_at = NOW()`,
      [user.userId, lat, lng, heading ?? null],
    );

    // Update driver session last_seen_at
    await this.sessions
      .createQueryBuilder()
      .update()
      .set({ lastSeenAt: new Date() })
      .where('driver_id = :id AND ended_at IS NULL', { id: user.userId })
      .execute();

    // Broadcast to admins
    this.server.to('admins').emit('driver:location:update', {
      driverId: user.userId,
      lat,
      lng,
      heading,
    });
  }

  // Emit to a specific user room
  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Emit to all admins
  emitToAdmins(event: string, data: unknown): void {
    this.server.to('admins').emit(event, data);
  }

  // Emit to all drivers
  emitToDrivers(event: string, data: unknown): void {
    this.server.to('drivers').emit(event, data);
  }
}
