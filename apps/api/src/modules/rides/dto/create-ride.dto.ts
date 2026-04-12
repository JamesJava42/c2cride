import { IsString, IsInt, Min, Max, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateRideDto {
  @IsNumber()
  pickupLat: number;

  @IsNumber()
  pickupLng: number;

  @IsString()
  pickupAddress: string;

  @IsNumber()
  dropLat: number;

  @IsNumber()
  dropLng: number;

  @IsString()
  dropAddress: string;

  @IsInt()
  @Min(1)
  @Max(4)
  passengerCount: number;

  /** ISO 8601 datetime — if provided, creates a scheduled (advance) ride */
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
