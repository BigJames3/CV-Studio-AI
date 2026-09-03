import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';
import { AuthSessionService } from '../auth/auth-session.service';
import { AuthAuditService } from '../auth/auth-audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UpdateUserDto } from './dto/update-user.dto';

const PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  phone: true,
  location: true,
  countryCode: true,
  bio: true,
  subscriptionTier: true,
  isEmailVerified: true,
  is2faEnabled: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: AuthSessionService,
    private readonly subscriptions: SubscriptionsService,
    private readonly audit: AuthAuditService
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    return user;
  }

  async exportMe(userId: string) {
    const user = await this.me(userId);
    const cvs = await this.prisma.cv.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        isPublic: true,
        publicUrl: true,
        locale: true,
        paper: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      exportedAt: new Date().toISOString(),
      user,
      cvs,
    };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
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

  /**
   * GDPR Art. 17: cancel billing immediately, purge CVs/AI/sessions, anonymize
   * the user row (kept for invoice/tax FKs). Never returns a fake purgeScheduled.
   */
  async deleteMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    await this.sessions.revokeAllForUser(userId);

    let stripeCanceled = false;
    let billingCanceled = false;
    try {
      const billing = await this.subscriptions.cancelImmediately(userId);
      stripeCanceled = billing.stripeCanceled;
      billingCanceled = true;
    } catch (error) {
      this.logger.error(
        `Billing cancel during deleteMe failed for ${userId}`,
        error instanceof Error ? error.stack : error
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cv.deleteMany({ where: { userId } });
      await tx.aiHistory.deleteMany({ where: { userId } });
      await tx.userOauthAccount.deleteMany({ where: { userId } });
      await tx.authSession.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.portfolio.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@purged.invalid`,
          passwordHash: null,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          location: null,
          countryCode: null,
          bio: null,
          avatarUrl: null,
          dateOfBirth: null,
          twoFactorSecretEncrypted: null,
          twoFactorBackupCodes: [],
          is2faEnabled: false,
          isEmailVerified: false,
          deletedAt: new Date(),
          subscriptionTier: 'free',
        },
      });
    });

    await this.audit.log({
      userId,
      action: 'gdpr.erase',
      entityId: userId,
      meta: { stripeCanceled, reason: 'GDPR Article 17' },
    });

    return {
      deleted: true,
      dataPurged: true,
      billingCanceled,
      stripeCanceled,
    };
  }
}
