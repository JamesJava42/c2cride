import { IsEmail, IsEnum, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+?[\d\s\-().]{7,15}$/, { message: 'Invalid phone number' })
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(['rider', 'driver'])
  role: 'rider' | 'driver';
}
