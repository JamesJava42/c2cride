import { IsString, IsOptional } from 'class-validator';

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  licenseState?: string;
}
