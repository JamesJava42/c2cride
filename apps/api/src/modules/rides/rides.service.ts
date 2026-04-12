import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RideRequest, RideStatus } from '../../entities/ride-request.entity.js';
import { RideEvent } from '../../entities/ride-event.entity.js';
import { RideAssignment } from '../../entities/ride-assignment.entity.js';
import { User } from '../../entities/user.entity.js';
import { ZonesService } from '../zones/zones.service.js';
import { CreateRideDto } from './dto/create-ride.dto.js';

const TERMINAL: RideStatus[] = [
  'completed', 'cancelled_by_rider', 'cancelled_by_driver',
  'cancelled_by_admin', 'rider_no_show', 'driver_no_show', 'expired_unassigned',
];

@Injectable()
export class RidesService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(RideRequest) private readonly rideRequests: Repository<RideRequest>,
    @InjectRepository(RideEvent) private readonly rideEvents: Repository<RideEvent>,
    @InjectRepository(RideAssignment) private readonly assignments: Repository<RideAssignment>,
    private readonly dataSource: DataSource,
    private readonly zonesService: ZonesService,
  ) {}

  // ─── Startup: ensure schema additions exist ───────────────────────────────

  async onApplicationBootstrap() {
    // Add 'scheduled' enum value if this DB hasn't been migrated yet
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'scheduled'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ride_status')
        ) THEN
          ALTER TYPE ride_status ADD VALUE 'scheduled' BEFORE 'requested';
        END IF;
      END $$;
    `);

    // Add scheduled_at column if not present
    await this.dataSource.query(`
      ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ
    `);

    // ride_messages table + index (idempotent)
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ride_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id),
        sender_role TEXT NOT NULL,
        sender_name TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_rm_ride ON ride_messages(ride_request_id, created_at)
    `);
  }

  // ─── Rider: create ride (immediate OR scheduled) ──────────────────────────

  async createRide(rider: User, dto: CreateRideDto): Promise<any> {
    const distanceMiles = 5;
    const durationMinutes = 15;
    const { estimate, rule } = await this.zonesService.estimateFare(distanceMiles, durationMinutes, null);

    const isScheduled = !!dto.scheduledAt;

    if (isScheduled) {
      const pickupTime = new Date(dto.scheduledAt!);
      const now = new Date();
      const minAdvance = new Date(now.getTime() + 30 * 60 * 1000); // at least 30 min ahead
      if (pickupTime <= minAdvance) {
        throw new BadRequestException('Scheduled pickup must be at least 30 minutes in the future.');
      }
    }

    const ride = this.rideRequests.create({
      riderId: rider.id,
      riderNameSnapshot: rider.name,
      riderPhoneSnapshot: rider.phone ?? '',
      pickupAddress: dto.pickupAddress,
      dropAddress: dto.dropAddress,
      passengerCount: dto.passengerCount,
      status: isScheduled ? 'scheduled' : 'requested',
      fareEstimate: estimate || null,
      estimatedDistanceMiles: distanceMiles,
      estimatedDurationMinutes: durationMinutes,
      quotedBaseFare: rule ? Number(rule.baseFare) : null,
      quotedRateSnapshot: rule ? {
        baseFare: rule.baseFare, perMile: rule.perMile,
        perMinute: rule.perMinute, minimumFare: rule.minimumFare,
      } : null,
      scheduledAt: isScheduled ? new Date(dto.scheduledAt!) : null,
    });

    await this.rideRequests.save(ride);

    if (dto.pickupLat != null && dto.pickupLng != null) {
      await this.dataSource.query(
        `UPDATE ride_requests
           SET pickup_coords = ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
               drop_coords   = ST_SetSRID(ST_MakePoint($3,$4),4326)::geography
         WHERE id = $5`,
        [dto.pickupLng, dto.pickupLat, dto.dropLng, dto.dropLat, ride.id],
      );
    }

    await this.logEvent(
      ride.id,
      isScheduled ? 'ride_scheduled' : 'ride_requested',
      null,
      ride.status,
      rider.id,
      'rider',
    );

    return this.findByIdDetailed(ride.id);
  }

  async cancelByRider(rideId: string, riderId: string): Promise<RideRequest> {
    const ride = await this.findById(rideId);
    if (ride.riderId !== riderId) throw new ForbiddenException();
    const cancellable: RideStatus[] = [
      'scheduled', 'requested', 'searching_driver', 'offer_pending',
      'driver_accepted', 'driver_enroute_pickup',
    ];
    if (!cancellable.includes(ride.status)) {
      throw new BadRequestException(`Cannot cancel ride in status: ${ride.status}`);
    }
    return this.transition(ride, 'cancelled_by_rider', riderId, 'rider');
  }

  async cancelByAdmin(rideId: string, adminId: string): Promise<RideRequest> {
    const ride = await this.findById(rideId);
    return this.transition(ride, 'cancelled_by_admin', adminId, 'admin');
  }

  // ─── Driver: browse immediate available rides ─────────────────────────────

  async findAvailableRides(): Promise<any[]> {
    return this.dataSource.query<any[]>(`
      SELECT id, rider_name_snapshot AS "riderNameSnapshot",
             pickup_address AS "pickupAddress", drop_address AS "dropAddress",
             passenger_count AS "passengerCount", status,
             fare_estimate AS "fareEstimate", requested_at AS "requestedAt"
      FROM ride_requests
      WHERE status IN ('requested','searching_driver')
      ORDER BY requested_at ASC
    `);
  }

  // ─── Driver: browse upcoming scheduled rides ──────────────────────────────

  async findScheduledRides(): Promise<any[]> {
    return this.dataSource.query<any[]>(`
      SELECT id, rider_name_snapshot AS "riderNameSnapshot",
             pickup_address AS "pickupAddress", drop_address AS "dropAddress",
             passenger_count AS "passengerCount", status,
             fare_estimate AS "fareEstimate",
             requested_at AS "requestedAt",
             scheduled_at AS "scheduledAt"
      FROM ride_requests
      WHERE status = 'scheduled'
        AND scheduled_at > NOW()
      ORDER BY scheduled_at ASC
    `);
  }

  // ─── Driver: self-assign immediate or accept scheduled ────────────────────

  async driverAcceptRide(rideId: string, driverId: string): Promise<any> {
    const sessions = await this.dataSource.query<{ id: string; vehicle_id: string }[]>(
      `SELECT id, vehicle_id FROM driver_sessions WHERE driver_id = $1 AND ended_at IS NULL LIMIT 1`,
      [driverId],
    );
    if (!sessions.length) {
      throw new BadRequestException('You must be online to accept a ride.');
    }
    const { vehicle_id: vehicleId } = sessions[0];

    const busy = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count
         FROM ride_assignments ra
         JOIN ride_requests rr ON rr.id = ra.ride_request_id
        WHERE ra.driver_id = $1
          AND ra.status = 'active'
          AND rr.status NOT IN (${TERMINAL.map((_, i) => `$${i + 2}`).join(',')})
          AND (rr.scheduled_at IS NULL OR rr.scheduled_at <= NOW() + INTERVAL '2 hours')`,
      [driverId, ...TERMINAL],
    );
    if (Number(busy[0].count) > 0) {
      throw new ConflictException('You already have an active ride in progress.');
    }

    // Atomically claim: works for both immediate and scheduled rides
    const updated = await this.dataSource.query<{ id: string }[]>(
      `UPDATE ride_requests
          SET status = 'driver_accepted', state_version = state_version + 1
        WHERE id = $1 AND status IN ('requested','searching_driver','scheduled')
        RETURNING id`,
      [rideId],
    );
    if (!updated.length) {
      throw new ConflictException('This ride is no longer available.');
    }

    const existingCount = await this.assignments.count({ where: { rideRequestId: rideId } });
    const assignment = this.assignments.create({
      rideRequestId: rideId,
      driverId,
      vehicleId,
      status: 'active',
      assignmentNo: existingCount + 1,
      acceptedAt: new Date(),
    });
    await this.assignments.save(assignment);
    await this.logEvent(rideId, 'status_driver_accepted', 'requested', 'driver_accepted', driverId, 'driver');

    return this.findByIdDetailed(rideId);
  }

  // ─── Driver lifecycle actions ─────────────────────────────────────────────

  async markSearching(rideId: string): Promise<RideRequest> {
    const ride = await this.findById(rideId);
    return this.transition(ride, 'searching_driver', null, 'system');
  }

  async markDriverEnroute(rideId: string, driverId: string): Promise<RideRequest> {
    const ride = await this.findById(rideId);
    if (ride.status !== 'driver_accepted') {
      throw new BadRequestException(`Expected driver_accepted, got ${ride.status}`);
    }
    // For scheduled rides, check it's not too early to start
    if (ride.scheduledAt) {
      const minsUntil = (ride.scheduledAt.getTime() - Date.now()) / 60000;
      if (minsUntil > 60) {
        throw new BadRequestException(
          `Scheduled pickup is ${Math.round(minsUntil)} minutes away. You can start driving within 60 minutes of pickup time.`,
        );
      }
    }
    return this.transition(ride, 'driver_enroute_pickup', driverId, 'driver');
  }

  async markDriverArrived(rideId: string, driverId: string): Promise<RideRequest> {
    const ride = await this.findById(rideId);
    if (ride.status !== 'driver_enroute_pickup') {
      throw new BadRequestException(`Expected driver_enroute_pickup, got ${ride.status}`);
    }
    return this.transition(ride, 'driver_arrived', driverId, 'driver');
  }

  async startTrip(rideId: string, driverId: string): Promise<RideRequest> {
    const ride = await this.findById(rideId);
    if (!['driver_arrived', 'rider_checked_in'].includes(ride.status)) {
      throw new BadRequestException(`Cannot start trip from status ${ride.status}`);
    }
    return this.transition(ride, 'trip_in_progress', driverId, 'driver');
  }

  async completeTrip(rideId: string, driverId: string): Promise<RideRequest> {
    const ride = await this.findById(rideId);
    if (ride.status !== 'trip_in_progress') {
      throw new BadRequestException('Trip is not in progress');
    }
    return this.transition(ride, 'completed', driverId, 'driver');
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async resetForRedispatch(rideId: string, adminId: string): Promise<any> {
    const ride = await this.findById(rideId);
    const resettable: RideStatus[] = ['cancelled_by_driver', 'admin_queue', 'driver_no_show'];
    if (!resettable.includes(ride.status)) {
      throw new BadRequestException(`Cannot re-dispatch ride in status: ${ride.status}`);
    }
    await this.dataSource.query(
      `UPDATE ride_assignments SET status = 'cancelled' WHERE ride_request_id = $1 AND status = 'active'`,
      [rideId],
    );
    return this.transition(ride, 'searching_driver', adminId, 'admin');
  }

  async findNeedsAttentionRides(): Promise<any[]> {
    return this.dataSource.query<any[]>(`
      SELECT id, rider_name_snapshot AS "riderNameSnapshot",
             rider_phone_snapshot AS "riderPhoneSnapshot",
             pickup_address AS "pickupAddress", drop_address AS "dropAddress",
             passenger_count AS "passengerCount", status,
             fare_estimate AS "fareEstimate", requested_at AS "requestedAt",
             scheduled_at AS "scheduledAt"
      FROM ride_requests
      WHERE status IN ('cancelled_by_driver','admin_queue','driver_no_show')
      ORDER BY requested_at DESC
    `);
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  async findById(id: string): Promise<RideRequest> {
    const ride = await this.rideRequests.findOne({ where: { id } });
    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }

  async findByIdDetailed(id: string): Promise<any> {
    const [ride] = await this.dataSource.query<any[]>(`
      SELECT id, rider_id AS "riderId",
             rider_name_snapshot AS "riderNameSnapshot",
             rider_phone_snapshot AS "riderPhoneSnapshot",
             pickup_address AS "pickupAddress", drop_address AS "dropAddress",
             passenger_count AS "passengerCount", status, state_version AS "stateVersion",
             fare_estimate AS "fareEstimate", fare_final AS "fareFinal",
             estimated_distance_miles AS "estimatedDistanceMiles",
             estimated_duration_minutes AS "estimatedDurationMinutes",
             requested_at AS "requestedAt",
             scheduled_at AS "scheduledAt",
             expires_at AS "expiresAt"
      FROM ride_requests WHERE id = $1
    `, [id]);
    if (!ride) throw new NotFoundException('Ride not found');

    const [drv] = await this.dataSource.query<any[]>(`
      SELECT u.name AS "driverName", u.phone AS "driverPhone",
             v.year, v.color, v.make, v.model, v.plate AS "vehiclePlate"
      FROM ride_assignments ra
      JOIN users u ON u.id = ra.driver_id
      JOIN vehicles v ON v.id = ra.vehicle_id
      WHERE ra.ride_request_id = $1 AND ra.status = 'active'
      LIMIT 1
    `, [id]);

    return {
      ...ride,
      ...(drv ? {
        driverName: drv.driverName,
        driverPhone: drv.driverPhone,
        vehicleInfo: `${drv.year} ${drv.color} ${drv.make} ${drv.model}`,
        vehiclePlate: drv.vehiclePlate,
      } : {}),
    };
  }

  async findActiveForRider(riderId: string): Promise<any | null> {
    const [ride] = await this.dataSource.query<any[]>(`
      SELECT id FROM ride_requests
      WHERE rider_id = $1
        AND status NOT IN (${TERMINAL.map((_, i) => `$${i + 2}`).join(',')})
        AND (scheduled_at IS NULL OR status != 'scheduled')
      ORDER BY requested_at DESC
      LIMIT 1
    `, [riderId, ...TERMINAL]);
    if (!ride) return null;
    return this.findByIdDetailed(ride.id);
  }

  /** Rider's upcoming confirmed scheduled rides */
  async findRiderUpcoming(riderId: string): Promise<any[]> {
    return this.dataSource.query<any[]>(`
      SELECT r.id, r.pickup_address AS "pickupAddress", r.drop_address AS "dropAddress",
             r.passenger_count AS "passengerCount", r.status,
             r.fare_estimate AS "fareEstimate",
             r.scheduled_at AS "scheduledAt",
             r.requested_at AS "requestedAt",
             u.name AS "driverName",
             v.make || ' ' || v.model AS "vehicleInfo",
             v.plate AS "vehiclePlate"
      FROM ride_requests r
      LEFT JOIN ride_assignments ra ON ra.ride_request_id = r.id AND ra.status = 'active'
      LEFT JOIN users u ON u.id = ra.driver_id
      LEFT JOIN vehicles v ON v.id = ra.vehicle_id
      WHERE r.rider_id = $1
        AND r.scheduled_at IS NOT NULL
        AND r.scheduled_at > NOW()
        AND r.status NOT IN (${TERMINAL.map((_, i) => `$${i + 2}`).join(',')})
      ORDER BY r.scheduled_at ASC
    `, [riderId, ...TERMINAL]);
  }

  async findByRider(riderId: string): Promise<RideRequest[]> {
    return this.rideRequests.find({
      where: { riderId },
      order: { requestedAt: 'DESC' },
    });
  }

  async findActiveRides(): Promise<any[]> {
    return this.dataSource.query<any[]>(`
      SELECT id, rider_name_snapshot AS "riderNameSnapshot",
             rider_phone_snapshot AS "riderPhoneSnapshot",
             pickup_address AS "pickupAddress", drop_address AS "dropAddress",
             passenger_count AS "passengerCount", status,
             fare_estimate AS "fareEstimate",
             requested_at AS "requestedAt",
             scheduled_at AS "scheduledAt"
      FROM ride_requests
      WHERE status NOT IN (${TERMINAL.map((_, i) => `$${i + 1}`).join(',')})
      ORDER BY requested_at DESC
    `, [...TERMINAL]);
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────

  async getMessages(rideId: string): Promise<any[]> {
    return this.dataSource.query<any[]>(`
      SELECT id, sender_id AS "senderId", sender_role AS "senderRole",
             sender_name AS "senderName", body, created_at AS "createdAt"
      FROM ride_messages
      WHERE ride_request_id = $1
      ORDER BY created_at ASC
    `, [rideId]);
  }

  async sendMessage(rideId: string, sender: User, senderRole: string, body: string): Promise<any> {
    const exists = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM ride_requests WHERE id = $1`, [rideId],
    );
    if (!exists.length) throw new NotFoundException('Ride not found');

    const [msg] = await this.dataSource.query<any[]>(`
      INSERT INTO ride_messages (ride_request_id, sender_id, sender_role, sender_name, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, sender_id AS "senderId", sender_role AS "senderRole",
                sender_name AS "senderName", body, created_at AS "createdAt"
    `, [rideId, sender.id, senderRole, sender.name, body.trim()]);
    return msg;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async transition(
    ride: RideRequest,
    newStatus: RideStatus,
    actorId: string | null,
    actorRole: 'rider' | 'driver' | 'admin' | 'system',
  ): Promise<RideRequest> {
    const previous = ride.status;
    ride.status = newStatus;
    ride.stateVersion += 1;
    await this.rideRequests.save(ride);
    await this.logEvent(ride.id, `status_${newStatus}`, previous, newStatus, actorId, actorRole);
    return ride;
  }

  private async logEvent(
    rideId: string,
    eventType: string,
    previousState: RideStatus | null,
    newState: RideStatus,
    actorId: string | null,
    actorRole: 'rider' | 'driver' | 'admin' | 'system',
  ): Promise<void> {
    const event = this.rideEvents.create({
      rideRequestId: rideId,
      eventType,
      previousState,
      newState,
      actorId,
      actorRole,
    });
    await this.rideEvents.save(event);
  }
}
