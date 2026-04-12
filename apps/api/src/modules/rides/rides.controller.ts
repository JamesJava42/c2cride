import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RidesService } from './rides.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';
import { CreateRideDto } from './dto/create-ride.dto.js';

@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  // ─── Rider ────────────────────────────────────────────────────────────────

  @Post()
  @Roles('rider')
  create(@CurrentUser() user: User, @Body() dto: CreateRideDto) {
    return this.ridesService.createRide(user, dto);
  }

  @Get('mine')
  @Roles('rider')
  getMyRides(@CurrentUser() user: User) {
    return this.ridesService.findByRider(user.id);
  }

  /** Returns rider's current active (non-scheduled) ride for page refresh recovery */
  @Get('my-active')
  @Roles('rider')
  getMyActiveRide(@CurrentUser() user: User) {
    return this.ridesService.findActiveForRider(user.id);
  }

  /** Returns rider's upcoming confirmed scheduled rides */
  @Get('my-upcoming')
  @Roles('rider')
  getMyUpcoming(@CurrentUser() user: User) {
    return this.ridesService.findRiderUpcoming(user.id);
  }

  @Post(':id/cancel')
  @Roles('rider')
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ridesService.cancelByRider(id, user.id);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Get('active')
  @Roles('admin')
  getActiveRides() {
    return this.ridesService.findActiveRides();
  }

  @Get('needs-attention')
  @Roles('admin')
  getNeedsAttentionRides() {
    return this.ridesService.findNeedsAttentionRides();
  }

  @Post(':id/admin-cancel')
  @Roles('admin')
  adminCancel(@CurrentUser() admin: User, @Param('id') id: string) {
    return this.ridesService.cancelByAdmin(id, admin.id);
  }

  @Post(':id/reset')
  @Roles('admin')
  resetForRedispatch(@CurrentUser() admin: User, @Param('id') id: string) {
    return this.ridesService.resetForRedispatch(id, admin.id);
  }

  // ─── Driver: browse & self-assign ─────────────────────────────────────────

  @Get('available')
  @Roles('driver')
  getAvailableRides() {
    return this.ridesService.findAvailableRides();
  }

  /** Upcoming scheduled rides that drivers can pre-accept */
  @Get('scheduled')
  @Roles('driver')
  getScheduledRides() {
    return this.ridesService.findScheduledRides();
  }

  @Post(':id/accept')
  @Roles('driver')
  acceptRide(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ridesService.driverAcceptRide(id, user.id);
  }

  // ─── Driver lifecycle ─────────────────────────────────────────────────────

  @Post(':id/enroute')
  @Roles('driver')
  markEnroute(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ridesService.markDriverEnroute(id, user.id);
  }

  @Post(':id/arrived')
  @Roles('driver')
  markArrived(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ridesService.markDriverArrived(id, user.id);
  }

  @Post(':id/start')
  @Roles('driver')
  startTrip(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ridesService.startTrip(id, user.id);
  }

  @Post(':id/complete')
  @Roles('driver')
  completeTrip(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ridesService.completeTrip(id, user.id);
  }

  // ─── Chat (rider ↔ driver) ─────────────────────────────────────────────────

  @Get(':id/messages')
  @Roles('rider', 'driver', 'admin')
  getMessages(@Param('id') id: string) {
    return this.ridesService.getMessages(id);
  }

  @Post(':id/messages')
  @Roles('rider', 'driver')
  sendMessage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    if (!body.message?.trim()) throw new BadRequestException('Message cannot be empty');
    return this.ridesService.sendMessage(id, user, user.role, body.message);
  }

  // ─── Generic (must be LAST — /:id catches everything else) ────────────────

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ridesService.findByIdDetailed(id);
  }
}
