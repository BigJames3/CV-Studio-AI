import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthSessionService } from './auth-session.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthAuditService } from './auth-audit.service';
import { TotpService } from './totp.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AuthSessionService,
    AuthRateLimitService,
    AuthAuditService,
    TotpService,
  ],
  exports: [AuthService, JwtModule, AuthSessionService],
})
export class AuthModule {}
