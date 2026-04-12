import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-().]{7,15}$/, { message: 'Invalid phone number' })
  phone?: string;
}
