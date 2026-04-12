import { IsString } from 'class-validator';

export class CreateDriverProfileDto {
  @IsString()
  licenseNumber: string;

  @IsString()
  licenseState: string;
}
