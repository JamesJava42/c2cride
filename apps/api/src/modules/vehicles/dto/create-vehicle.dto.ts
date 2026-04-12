import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  make: string;

  @IsString()
  model: string;

  @IsInt()
  @Min(1990)
  year: number;

  @IsString()
  plate: string;

  @IsString()
  color: string;

  @IsInt()
  @Min(1)
  @Max(4)
  seatCapacity: number;

  @IsString()
  insuranceExpiry: string; // YYYY-MM-DD
}
