import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity.js';
import { Driver } from '../../entities/driver.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; refreshToken: string }> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.users.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role,
      status: 'active',
    });
    await this.users.save(user);

    // Auto-create a pending driver profile so vehicles/sessions can be added immediately
    if (dto.role === 'driver') {
      const driver = this.drivers.create({
        id: user.id,
        licenseNumber: '',   // driver fills these in via profile page
        licenseState: '',
        approvalStatus: 'pending',
        documentsComplete: false,
      });
      await this.drivers.save(driver);
    }

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user || user.status !== 'active') throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async refresh(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    return this.issueTokens(user);
  }

  private issueTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload, {
      secret: this.cfg.get<string>('JWT_SECRET'),
      expiresIn: 900,    // 15 min
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: 604800, // 7 days
    });
    return { accessToken, refreshToken };
  }
}
