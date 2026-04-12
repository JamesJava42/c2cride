import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DispatchService } from './dispatch.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../../entities/user.entity.js';
import { IsBoolean } from 'class-validator';

class RespondOfferDto {
  @IsBoolean()
  accepted: boolean;
}

@Controller('dispatch')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get('offers/pending')
  @Roles('driver')
  getMyPendingOffer(@CurrentUser() user: User) {
    return this.dispatchService.getPendingOfferForDriver(user.id);
  }

  @Post('rides/:rideId/dispatch')
  @Roles('admin')
  dispatchRide(@Param('rideId') rideId: string) {
    return this.dispatchService.dispatchNextDriver(rideId);
  }

  @Post('offers/:offerId/respond')
  @Roles('driver')
  respondToOffer(
    @CurrentUser() user: User,
    @Param('offerId') offerId: string,
    @Body() dto: RespondOfferDto,
  ) {
    return this.dispatchService.driverRespond(offerId, user.id, dto.accepted);
  }
}
