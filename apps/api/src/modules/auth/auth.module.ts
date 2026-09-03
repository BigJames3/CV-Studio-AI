import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthSessionService } from './auth-session.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthAuditService } from './auth-audit.service';
import { TotpService } from './totp.service';
import { OAuthStateService } from './oauth-state.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { assertAuthSecrets, getJwtAccessSecret } from './auth-secrets';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtAccessSecret(),
      }),
    }),
    AnalyticsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AuthSessionService,
    AuthRateLimitService,
    AuthAuditService,
    TotpService,
    OAuthStateService,
  ],
  exports: [AuthService, JwtModule, AuthSessionService, AuthAuditService],
})
export class AuthModule implements OnModuleInit {
  onModuleInit() {
    assertAuthSecrets();
  }
}
