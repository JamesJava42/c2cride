import { IsString, IsOptional } from 'class-validator';

export class ReportIncidentDto {
  @IsOptional()
  @IsString()
  rideRequestId?: string;

  @IsString()
  type: string;

  @IsString()
  description: string;
}
