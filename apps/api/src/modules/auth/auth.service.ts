import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.module';
import { RedisService } from '../../redis/redis.module';
import { MailService } from '../../mail/mail.service';
import { EmailService } from '../email/email.service';
import { AuthSessionService, SessionMeta } from './auth-session.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthAuditService } from './auth-audit.service';
import { TotpService } from './totp.service';
import { decryptUtf8, encryptUtf8 } from './crypto.util';
import { AnalyticsEventsService } from '../analytics/analytics-events.service';
import {
  RegisterDto,
  LoginDto,
  OAuthGoogleDto,
  OAuthLinkedInDto,
  OAuthAppleDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateProfileDto,
  TwoFactorDisableDto,
} from './dto/auth.dto';

export type RequestContext = SessionMeta & { ip: string };

export type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: { id: string; email: string; subscriptionTier: string; isEmailVerified?: boolean };
};

type RefreshPayload = { sub: string; typ?: string; jti?: string; fid?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly emailService: EmailService,
    private readonly sessions: AuthSessionService,
    private readonly rateLimit: AuthRateLimitService,
    private readonly audit: AuthAuditService,
    private readonly totp: TotpService,
    private readonly analyticsEvents: AnalyticsEventsService
  ) {}

  async register(dto: RegisterDto, ctx: RequestContext): Promise<TokenBundle> {
    await this.rateLimit.checkRegister(ctx.ip);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    await this.sendVerificationEmail(user.id, user.email);

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'there';
    await this.emailService.sendWelcomeEmail(user.email, displayName);

    this.analyticsEvents.trackSignup(user.id, user.email, 'password');

    await this.audit.log({
      userId: user.id,
      action: 'auth.register',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return this.issueTokens(user.id, user.email, user.subscriptionTier, ctx, false);
  }

  async login(dto: LoginDto, ctx: RequestContext): Promise<TokenBundle | { requires2fa: true }> {
    await this.rateLimit.checkLogin(ctx.ip, dto.email);

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user?.passwordHash) {
      await this.audit.log({
        action: 'auth.login.fail',
        entityId: '00000000-0000-0000-0000-000000000000',
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        meta: { email: dto.email.toLowerCase(), reason: 'unknown_user' },
      });
      this.analyticsEvents.trackLoginFailed('anonymous', 'unknown_user');
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      await this.audit.log({
        userId: user.id,
        action: 'auth.login.fail',
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        meta: { reason: 'bad_password' },
      });
      this.analyticsEvents.trackLoginFailed(user.id, 'bad_password');
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (user.is2faEnabled) {
      if (!dto.totp) {
        return { requires2fa: true };
      }
      if (!user.twoFactorSecretEncrypted) {
        throw new BadRequestException({
          code: '2FA_MISCONFIGURED',
          message: '2FA is enabled but no secret is stored. Contact support.',
        });
      }
      const secret = decryptUtf8(Buffer.from(user.twoFactorSecretEncrypted));
      if (!this.totp.verify(secret, dto.totp)) {
        await this.audit.log({
          userId: user.id,
          action: 'auth.login.fail',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          meta: { reason: 'bad_totp' },
        });
        throw new UnauthorizedException({
          code: 'INVALID_2FA',
          message: 'Invalid authentication code',
        });
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      userId: user.id,
      action: 'auth.login.success',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    this.analyticsEvents.trackLoginSucceeded(user.id, user.email, user.subscriptionTier);

    return this.issueTokens(user.id, user.email, user.subscriptionTier, ctx, user.isEmailVerified);
  }

  async refresh(refreshToken: string, ctx: RequestContext): Promise<TokenBundle> {
    await this.rateLimit.checkRefresh(ctx.ip);

    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      });
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH',
        message: 'Invalid refresh token',
      });
    }

    if (payload.typ !== 'refresh' || !payload.jti || !payload.fid || !payload.sub) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH',
        message: 'Invalid refresh token',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'User not found' });
    }

    const { jti: newJti } = this.sessions.newIds();
    const result = await this.sessions.rotate(user.id, payload.fid, payload.jti, newJti);

    if (result === 'reuse') {
      await this.audit.log({
        userId: user.id,
        action: 'auth.refresh.reuse',
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        meta: { familyId: payload.fid },
      });
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH',
        message: 'Refresh token reuse detected',
      });
    }
    if (result === 'invalid') {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH',
        message: 'Invalid refresh token',
      });
    }

    return this.issueTokens(user.id, user.email, user.subscriptionTier, ctx, user.isEmailVerified, {
      jti: newJti,
      familyId: payload.fid,
      skipSessionCreate: true,
    });
  }

  async logout(userId: string, refreshToken: string | undefined, ctx: RequestContext) {
    if (refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
        });
        if (payload.sub === userId && payload.jti) {
          await this.sessions.revokeByRefreshJti(userId, payload.jti, payload.fid);
        }
      } catch {
        // Cookie present but invalid — still clear cookies client-side
      }
    } else {
      // No refresh cookie (e.g. cleared already / cross-origin miss) — revoke all active sessions
      await this.sessions.revokeAllForUser(userId);
    }

    await this.audit.log({
      userId,
      action: 'auth.logout',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    this.analyticsEvents.trackLogout(userId);

    return { revoked: true };
  }

  async oauthGoogle(dto: OAuthGoogleDto, ctx: RequestContext): Promise<TokenBundle> {
    const profile = await this.resolveGoogleProfile(dto);
    const email = profile.email.toLowerCase();

    const oauth = await this.prisma.userOauthAccount.findUnique({
      where: {
        provider_providerId: { provider: 'google', providerId: profile.sub },
      },
      include: { user: true },
    });

    let user = oauth?.user ?? null;

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { email, deletedAt: null },
      });

      if (user) {
        if (!user.isEmailVerified) {
          throw new BadRequestException({
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Log in with password and verify email before linking Google',
          });
        }
        await this.prisma.userOauthAccount.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerId: profile.sub,
            accessTokenEncrypted: Buffer.from(profile.accessToken ?? 'oauth', 'utf8'),
            refreshTokenEncrypted: profile.refreshToken
              ? Buffer.from(profile.refreshToken, 'utf8')
              : undefined,
            tokenExpiresAt: profile.expiresAt,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email,
            firstName: profile.givenName || 'User',
            lastName: profile.familyName || 'Google',
            isEmailVerified: profile.emailVerified,
            avatarUrl: profile.picture,
            passwordHash: null,
            oauthAccounts: {
              create: {
                provider: 'google',
                providerId: profile.sub,
                accessTokenEncrypted: Buffer.from(profile.accessToken ?? 'oauth', 'utf8'),
                refreshTokenEncrypted: profile.refreshToken
                  ? Buffer.from(profile.refreshToken, 'utf8')
                  : undefined,
                tokenExpiresAt: profile.expiresAt,
              },
            },
          },
        });
        this.analyticsEvents.trackSignup(user.id, user.email, 'google');
      }
    }

    if (user.deletedAt) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'User not found' });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      userId: user.id,
      action: 'auth.oauth.google',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    this.analyticsEvents.trackLoginSucceeded(user.id, user.email, user.subscriptionTier);

    return this.issueTokens(user.id, user.email, user.subscriptionTier, ctx, user.isEmailVerified);
  }

  async oauthLinkedIn(dto: OAuthLinkedInDto, ctx: RequestContext): Promise<TokenBundle> {
    const profile = await this.resolveLinkedInProfile(dto);
    const email = profile.email.toLowerCase();

    const oauth = await this.prisma.userOauthAccount.findUnique({
      where: {
        provider_providerId: { provider: 'linkedin', providerId: profile.sub },
      },
      include: { user: true },
    });

    let user = oauth?.user ?? null;

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { email, deletedAt: null },
      });

      if (user) {
        if (!user.isEmailVerified) {
          throw new BadRequestException({
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Log in with password and verify email before linking LinkedIn',
          });
        }
        await this.prisma.userOauthAccount.create({
          data: {
            userId: user.id,
            provider: 'linkedin',
            providerId: profile.sub,
            accessTokenEncrypted: Buffer.from(profile.accessToken ?? 'oauth', 'utf8'),
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email,
            firstName: profile.givenName || 'User',
            lastName: profile.familyName || 'LinkedIn',
            isEmailVerified: true,
            avatarUrl: profile.picture,
            passwordHash: null,
            oauthAccounts: {
              create: {
                provider: 'linkedin',
                providerId: profile.sub,
                accessTokenEncrypted: Buffer.from(profile.accessToken ?? 'oauth', 'utf8'),
              },
            },
          },
        });
        this.analyticsEvents.trackSignup(user.id, user.email, 'linkedin');
      }
    }

    if (user.deletedAt) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'User not found' });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      userId: user.id,
      action: 'auth.oauth.linkedin',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    this.analyticsEvents.trackLoginSucceeded(user.id, user.email, user.subscriptionTier);

    return this.issueTokens(user.id, user.email, user.subscriptionTier, ctx, user.isEmailVerified);
  }

  async oauthApple(_dto: OAuthAppleDto) {
    throw new BadRequestException({
      code: 'NOT_IMPLEMENTED',
      message: 'Apple Sign-In is planned for Phase 2',
    });
  }

  async enable2fa(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    if (user.is2faEnabled) {
      throw new BadRequestException({
        code: '2FA_ALREADY_ENABLED',
        message: '2FA is already enabled',
      });
    }

    const { secret, uri } = this.totp.generateSecret(user.email);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecretEncrypted: Uint8Array.from(encryptUtf8(secret)),
        is2faEnabled: false,
      },
    });

    const qrCodeDataUrl = await this.totp.qrDataUrl(uri);
    await this.audit.log({ userId, action: 'auth.2fa.enable_start' });

    return {
      secret,
      otpauthUrl: uri,
      qrCodeDataUrl,
      message: 'Scan the QR code then confirm with POST /auth/2fa/verify',
    };
  }

  async verify2fa(userId: string, code: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user?.twoFactorSecretEncrypted) {
      throw new BadRequestException({
        code: '2FA_NOT_STARTED',
        message: 'Call /auth/2fa/enable first',
      });
    }

    const secret = decryptUtf8(Buffer.from(user.twoFactorSecretEncrypted));
    if (!this.totp.verify(secret, code)) {
      throw new UnauthorizedException({
        code: 'INVALID_2FA',
        message: 'Invalid authentication code',
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { is2faEnabled: true },
    });
    await this.audit.log({ userId, action: 'auth.2fa.enabled' });

    return { enabled: true };
  }

  async disable2fa(userId: string, dto: TwoFactorDisableDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    if (!user.is2faEnabled || !user.twoFactorSecretEncrypted) {
      throw new BadRequestException({
        code: '2FA_NOT_ENABLED',
        message: '2FA is not enabled',
      });
    }

    const secret = decryptUtf8(Buffer.from(user.twoFactorSecretEncrypted));
    if (!this.totp.verify(secret, dto.code)) {
      throw new UnauthorizedException({
        code: 'INVALID_2FA',
        message: 'Invalid authentication code',
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { is2faEnabled: false, twoFactorSecretEncrypted: null },
    });
    await this.audit.log({ userId, action: 'auth.2fa.disabled' });

    return { disabled: true };
  }

  async forgotPassword(email: string, ctx: RequestContext) {
    await this.rateLimit.checkForgotPassword(email);

    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });

    if (user?.passwordHash) {
      const raw = randomBytes(32).toString('hex');
      const hash = this.hashToken(raw);
      await this.redis.connect();
      await this.redis.set(`pwdreset:${hash}`, user.id, 60 * 60);
      await this.mail.sendPasswordReset(user.email, raw);
      await this.audit.log({
        userId: user.id,
        action: 'auth.password_reset.request',
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }

    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDto, ctx: RequestContext) {
    await this.redis.connect();
    const hash = this.hashToken(dto.token);
    const userId = await this.redis.get(`pwdreset:${hash}`);
    if (!userId) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.redis.del(`pwdreset:${hash}`);
    await this.sessions.revokeAllForUser(userId);

    await this.audit.log({
      userId,
      action: 'auth.password_reset.confirm',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { reset: true };
  }

  async verifyEmail(token: string, ctx: RequestContext) {
    await this.redis.connect();
    const hash = this.hashToken(token);
    const userId = await this.redis.get(`emailverify:${hash}`);
    if (!userId) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
    await this.redis.del(`emailverify:${hash}`);

    await this.audit.log({
      userId,
      action: 'auth.email.verify',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    this.analyticsEvents.trackEmailVerified(userId);

    return { verified: true };
  }

  async resendVerification(userId: string, ctx: RequestContext) {
    await this.rateLimit.checkResendVerification(userId);
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    if (user.isEmailVerified) return { sent: true, alreadyVerified: true };

    await this.sendVerificationEmail(user.id, user.email);
    await this.audit.log({
      userId,
      action: 'auth.email.resend',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { sent: true };
  }

  async listSessions(userId: string) {
    const items = await this.sessions.listSessions(userId);
    return { items };
  }

  async revokeSession(userId: string, sessionId: string) {
    const ok = await this.sessions.revokeSessionById(userId, sessionId);
    if (!ok) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Session not found' });
    return { revoked: true };
  }

  async revokeAllSessions(userId: string) {
    await this.sessions.revokeAllForUser(userId);
    return { revoked: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        location: true,
        bio: true,
        subscriptionTier: true,
        isEmailVerified: true,
        is2faEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    const avatarUrl =
      dto.avatarUrl === undefined
        ? undefined
        : dto.avatarUrl === null || dto.avatarUrl === ''
          ? null
          : dto.avatarUrl;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        location: true,
        bio: true,
        subscriptionTier: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ctx: RequestContext) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    if (!user.passwordHash) {
      throw new BadRequestException({
        code: 'NO_PASSWORD',
        message: 'This account uses OAuth only. Set a password via password reset first.',
      });
    }

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      await this.audit.log({
        userId,
        action: 'auth.password.change.fail',
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        meta: { reason: 'bad_current_password' },
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'New password must be different from the current password',
      });
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    // Invalidate other devices; caller’s access token remains valid until expiry
    await this.sessions.revokeAllForUser(userId);

    await this.audit.log({
      userId,
      action: 'auth.password.change',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { changed: true, message: 'Mot de passe changé' };
  }

  private async sendVerificationEmail(userId: string, email: string) {
    const raw = randomBytes(32).toString('hex');
    const hash = this.hashToken(raw);
    await this.redis.connect();
    await this.redis.set(`emailverify:${hash}`, userId, 24 * 60 * 60);
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationSentAt: new Date() },
    });
    await this.mail.sendEmailVerification(email, raw);
  }

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async issueTokens(
    userId: string,
    email: string,
    subscriptionTier: string,
    ctx: RequestContext,
    isEmailVerified = false,
    opts?: { jti: string; familyId: string; skipSessionCreate?: boolean }
  ): Promise<TokenBundle> {
    const roles = [`${subscriptionTier}_user`];
    const ids = opts ?? this.sessions.newIds();

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, subscriptionTier, roles },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
        expiresIn: '15m',
      }
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, typ: 'refresh', jti: ids.jti, fid: ids.familyId },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
        expiresIn: '7d',
      }
    );

    if (!opts?.skipSessionCreate) {
      await this.sessions.createSession(userId, ids.jti, ids.familyId, {
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      user: { id: userId, email, subscriptionTier, isEmailVerified },
    };
  }

  private async resolveLinkedInProfile(dto: OAuthLinkedInDto): Promise<{
    sub: string;
    email: string;
    givenName?: string;
    familyName?: string;
    picture?: string;
    accessToken?: string;
  }> {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new BadRequestException({
        code: 'NOT_CONFIGURED',
        message: 'LINKEDIN_CLIENT_ID/SECRET is not configured',
      });
    }

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: dto.code,
        redirect_uri: dto.redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedException({
        code: 'OAUTH_FAILED',
        message: 'LinkedIn token exchange failed',
      });
    }

    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) {
      throw new UnauthorizedException({
        code: 'OAUTH_FAILED',
        message: 'LinkedIn did not return an access_token',
      });
    }

    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) {
      throw new UnauthorizedException({
        code: 'OAUTH_FAILED',
        message: 'LinkedIn profile fetch failed',
      });
    }

    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      name?: string;
    };

    if (!profile.sub || !profile.email) {
      throw new UnauthorizedException({
        code: 'OAUTH_FAILED',
        message: 'LinkedIn account missing sub/email (request openid email profile scopes)',
      });
    }

    return {
      sub: profile.sub,
      email: profile.email,
      givenName: profile.given_name,
      familyName: profile.family_name,
      picture: profile.picture,
      accessToken: tokens.access_token,
    };
  }

  private async resolveGoogleProfile(dto: OAuthGoogleDto): Promise<{
    sub: string;
    email: string;
    emailVerified: boolean;
    givenName?: string;
    familyName?: string;
    picture?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException({
        code: 'NOT_CONFIGURED',
        message: 'GOOGLE_CLIENT_ID is not configured',
      });
    }

    if (dto.idToken) {
      return this.verifyGoogleIdToken(dto.idToken, clientId);
    }

    if (dto.code && dto.redirectUri) {
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientSecret) {
        throw new BadRequestException({
          code: 'NOT_CONFIGURED',
          message: 'GOOGLE_CLIENT_SECRET is not configured',
        });
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: dto.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: dto.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        throw new UnauthorizedException({
          code: 'OAUTH_FAILED',
          message: 'Google token exchange failed',
        });
      }

      const tokens = (await tokenRes.json()) as {
        id_token?: string;
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };

      if (!tokens.id_token) {
        throw new UnauthorizedException({
          code: 'OAUTH_FAILED',
          message: 'Google did not return an id_token',
        });
      }

      const profile = await this.verifyGoogleIdToken(tokens.id_token, clientId);
      return {
        ...profile,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      };
    }

    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Provide idToken or code + redirectUri',
    });
  }

  private async verifyGoogleIdToken(idToken: string, clientId: string) {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) {
      throw new UnauthorizedException({
        code: 'OAUTH_FAILED',
        message: 'Invalid Google id token',
      });
    }

    const payload = (await res.json()) as {
      sub: string;
      email?: string;
      email_verified?: string | boolean;
      given_name?: string;
      family_name?: string;
      picture?: string;
      aud?: string;
    };

    if (payload.aud !== clientId) {
      throw new UnauthorizedException({
        code: 'OAUTH_FAILED',
        message: 'Google token audience mismatch',
      });
    }
    if (!payload.email) {
      throw new UnauthorizedException({
        code: 'OAUTH_FAILED',
        message: 'Google account has no email',
      });
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      givenName: payload.given_name,
      familyName: payload.family_name,
      picture: payload.picture,
    };
  }
}
