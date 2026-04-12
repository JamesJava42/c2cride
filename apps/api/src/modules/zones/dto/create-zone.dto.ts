import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  minFare?: number;
}
