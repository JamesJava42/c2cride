import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { DriverOffer } from '../../entities/driver-offer.entity.js';
import { RideRequest } from '../../entities/ride-request.entity.js';
import { RideAssignment } from '../../entities/ride-assignment.entity.js';
import { Driver } from '../../entities/driver.entity.js';
import { DriverSession } from '../../entities/driver-session.entity.js';

const OFFER_KEY = (offerId: string) => `offer:${offerId}`;
const ACTIVE_OFFER_KEY = (rideId: string) => `active_offer:${rideId}`;

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  private readonly offerTtl: number;
  private readonly maxAttempts: number;

  constructor(
    @InjectRepository(DriverOffer) private readonly offers: Repository<DriverOffer>,
    @InjectRepository(RideRequest) private readonly rides: Repository<RideRequest>,
    @InjectRepository(RideAssignment) private readonly assignments: Repository<RideAssignment>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(DriverSession) private readonly sessions: Repository<DriverSession>,
    @InjectRedis() private readonly redis: Redis,
    private readonly cfg: ConfigService,
  ) {
    this.offerTtl = cfg.get<number>('OFFER_TTL_SECONDS', 15);
    this.maxAttempts = cfg.get<number>('MAX_DISPATCH_ATTEMPTS', 3);
  }

  async dispatchNextDriver(rideId: string): Promise<DriverOffer | null> {
    const ride = await this.rides.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    // Get previously offered driver IDs for this ride
    const previousOffers = await this.offers.find({
      where: { rideRequestId: rideId },
      select: ['driverId', 'attemptNo'],
    });

    if (previousOffers.length >= this.maxAttempts) {
      this.logger.warn(`Max dispatch attempts reached for ride ${rideId}`);
      ride.status = 'admin_queue';
      ride.stateVersion += 1;
      await this.rides.save(ride);
      throw new ConflictException('Max dispatch attempts reached for this ride. Cancel and re-request if needed.');
    }

    const alreadyOffered = previousOffers.map((o) => o.driverId);

    // Find eligible online driver (approved, not in another active ride)
    const driver = await this.findEligibleDriver(alreadyOffered);
    if (!driver) {
      this.logger.warn(`No eligible driver found for ride ${rideId}`);
      throw new BadRequestException('No eligible driver online. Approve a driver and make sure they are online before dispatching.');
    }

    const session = await this.sessions.findOne({
      where: { driverId: driver.id, endedAt: IsNull() },
    });
    if (!session) return null;

    const attemptNo = previousOffers.length + 1;
    const expiresAt = new Date(Date.now() + this.offerTtl * 1000);

    const offer = this.offers.create({
      rideRequestId: rideId,
      driverId: driver.id,
      attemptNo,
      expiresAt,
      response: 'pending',
    });
    await this.offers.save(offer);

    // Track offer in Redis with TTL
    await this.redis.setex(OFFER_KEY(offer.id), this.offerTtl, JSON.stringify({ rideId, driverId: driver.id }));
    await this.redis.setex(ACTIVE_OFFER_KEY(rideId), this.offerTtl, offer.id);

    // Update ride status
    ride.status = 'offer_pending';
    ride.stateVersion += 1;
    await this.rides.save(ride);

    return offer;
  }

  async driverRespond(offerId: string, driverId: string, accepted: boolean): Promise<RideAssignment | null> {
    const offer = await this.offers.findOne({ where: { id: offerId, driverId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.response !== 'pending') throw new BadRequestException('Offer already responded to');

    const isStillActive = await this.redis.exists(OFFER_KEY(offerId));
    if (!isStillActive) {
      offer.response = 'expired';
      offer.expiredReason = 'TTL expired';
      offer.respondedAt = new Date();
      await this.offers.save(offer);
      throw new BadRequestException('Offer has expired');
    }

    offer.respondedAt = new Date();
    offer.response = accepted ? 'accepted' : 'declined';
    await this.offers.save(offer);

    // Clear Redis keys
    await this.redis.del(OFFER_KEY(offerId));
    await this.redis.del(ACTIVE_OFFER_KEY(offer.rideRequestId));

    if (!accepted) {
      // Trigger next dispatch attempt (handled by caller/watchdog)
      const ride = await this.rides.findOne({ where: { id: offer.rideRequestId } });
      if (ride) {
        ride.status = 'searching_driver';
        ride.stateVersion += 1;
        await this.rides.save(ride);
      }
      return null;
    }

    // Create assignment
    const session = await this.sessions.findOne({
      where: { driverId, endedAt: IsNull() },
    });
    if (!session) throw new BadRequestException('Driver session not found');

    const existingCount = await this.assignments.count({
      where: { rideRequestId: offer.rideRequestId },
    });

    const assignment = this.assignments.create({
      rideRequestId: offer.rideRequestId,
      driverId,
      vehicleId: session.vehicleId,
      status: 'active',
      assignmentNo: existingCount + 1,
      acceptedAt: new Date(),
    });
    await this.assignments.save(assignment);

    // Update ride status
    const ride = await this.rides.findOne({ where: { id: offer.rideRequestId } });
    if (ride) {
      ride.status = 'driver_accepted';
      ride.stateVersion += 1;
      await this.rides.save(ride);
    }

    return assignment;
  }

  async getPendingOffer(rideId: string): Promise<DriverOffer | null> {
    return this.offers.findOne({
      where: { rideRequestId: rideId, response: 'pending' },
      order: { offeredAt: 'DESC' },
    });
  }

  async getPendingOfferForDriver(driverId: string): Promise<DriverOffer | null> {
    return this.offers.findOne({
      where: { driverId, response: 'pending' },
      relations: ['rideRequest'],
      order: { offeredAt: 'DESC' },
    });
  }

  private async findEligibleDriver(excludeDriverIds: string[]): Promise<Driver | null> {
    const query = this.drivers
      .createQueryBuilder('d')
      .innerJoin('driver_sessions', 'ds', 'ds.driver_id = d.id AND ds.ended_at IS NULL AND ds.is_online = true')
      .where('d.approvalStatus = :status', { status: 'approved' });

    if (excludeDriverIds.length > 0) {
      query.andWhere('d.id NOT IN (:...excluded)', { excluded: excludeDriverIds });
    }

    // Exclude drivers in an active assignment
    query.andWhere(`
      NOT EXISTS (
        SELECT 1 FROM ride_assignments ra
        INNER JOIN ride_requests rr ON rr.id = ra.ride_request_id
        WHERE ra.driver_id = d.id
          AND ra.status = 'active'
          AND rr.status NOT IN ('completed','cancelled_by_rider','cancelled_by_driver','cancelled_by_admin','rider_no_show','driver_no_show','expired_unassigned')
      )
    `);

    query.orderBy('d.reliabilityScore', 'DESC').limit(1);
    return query.getOne();
  }
}
