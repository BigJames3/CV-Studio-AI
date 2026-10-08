import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.module';
import { AuthSessionService } from '../auth/auth-session.service';
import { AuthAuditService } from '../auth/auth-audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

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

  /**
   * Copy of the personal data stored in this database for the account. Secrets (password
   * hash, 2FA secret and backup codes, OAuth tokens, refresh token ids) are never included;
   * `notIncluded` lists what the export does not cover so the user is not misled.
   */
  async exportMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        ...PROFILE_SELECT,
        dateOfBirth: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        trialUsed: true,
        trialStartedAt: true,
        trialEndsAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });

    const [
      cvs,
      aiHistory,
      subscription,
      oauthAccounts,
      sessions,
      notifications,
      portfolios,
      teamMemberships,
      sellerProfile,
      marketplacePurchases,
      templateReviews,
      disputes,
      analyticsEvents,
      securityLog,
    ] = await Promise.all([
      this.prisma.cv.findMany({
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
          versions: {
            select: { versionNumber: true, label: true, content: true, createdAt: true },
          },
          atsReports: {
            select: {
              jobDescription: true,
              atsScore: true,
              missingKeywords: true,
              recommendations: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.aiHistory.findMany({
        where: { userId },
        select: { cvId: true, actionType: true, prompt: true, result: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.findUnique({
        where: { userId },
        select: {
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          canceledAt: true,
          provider: true,
          createdAt: true,
          plan: { select: { name: true } },
          payments: {
            select: {
              amount: true,
              currency: true,
              status: true,
              paymentMethod: true,
              createdAt: true,
            },
          },
          invoices: {
            select: {
              invoiceNumber: true,
              amount: true,
              currency: true,
              status: true,
              dueDate: true,
              paidAt: true,
            },
          },
        },
      }),
      this.prisma.userOauthAccount.findMany({
        where: { userId },
        select: { provider: true, providerId: true, createdAt: true },
      }),
      this.prisma.authSession.findMany({
        where: { userId },
        select: {
          createdAt: true,
          lastActivityAt: true,
          expiresAt: true,
          revokedAt: true,
          userAgent: true,
          ipAddress: true,
        },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        select: { type: true, title: true, message: true, isRead: true, createdAt: true },
      }),
      this.prisma.portfolio.findMany({
        where: { userId },
        select: {
          title: true,
          description: true,
          items: true,
          publicUrl: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.teamMember.findMany({
        where: { userId },
        select: { role: true, createdAt: true, team: { select: { name: true } } },
      }),
      this.prisma.sellerProfile.findUnique({
        where: { userId },
        select: {
          displayName: true,
          slug: true,
          bio: true,
          avatarUrl: true,
          country: true,
          portfolioUrl: true,
          status: true,
          tier: true,
          payoutsEnabled: true,
          tosAcceptedAt: true,
          createdAt: true,
          payouts: {
            select: { amountCents: true, currency: true, status: true, paidAt: true },
          },
        },
      }),
      this.prisma.marketplacePurchase.findMany({
        where: { buyerId: userId },
        select: {
          listingId: true,
          amountCents: true,
          currency: true,
          refundedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.templateReview.findMany({
        where: { reviewerId: userId },
        select: { marketplaceTemplateId: true, rating: true, comment: true, createdAt: true },
      }),
      this.prisma.marketplaceDispute.findMany({
        where: { buyerId: userId },
        select: { type: true, status: true, reason: true, createdAt: true, resolvedAt: true },
      }),
      this.prisma.analyticsEvent.findMany({
        where: { userId },
        select: { eventType: true, eventData: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        select: {
          action: true,
          entityType: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    await this.audit.log({ userId, action: 'gdpr.export', entityId: userId });

    return {
      exportedAt: new Date().toISOString(),
      user,
      cvs,
      aiHistory,
      subscription,
      oauthAccounts,
      sessions,
      notifications,
      portfolios,
      teamMemberships,
      sellerProfile,
      marketplacePurchases,
      templateReviews,
      disputes,
      analyticsEvents,
      securityLog,
      notIncluded: [
        'Secrets: password hash, two-factor secret and backup codes, OAuth tokens',
        'Data held by processors (Stripe, PostHog, Sentry, the AI provider, the e-mail relay): ask them or contact us',
        'Server logs and backups',
      ],
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
  async deleteMe(userId: string, dto: DeleteAccountDto = {}) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    await this.assertDeletionConfirmed(user, dto);

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
      await tx.teamMember.deleteMany({ where: { userId } });
      await tx.collabSession.deleteMany({ where: { userId } });
      await tx.collabSnapshot.updateMany({
        where: { createdById: userId },
        data: { createdById: null },
      });
      // Product metrics keep their counts but no longer point to the person.
      await tx.analyticsEvent.updateMany({
        where: { userId },
        data: { userId: null, sessionId: null },
      });
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

  /**
   * A stolen access token alone must not erase an account: password accounts re-enter the
   * password, OAuth-only accounts type their e-mail. 403 (not 401) so the client does not
   * try to refresh the session.
   */
  private async assertDeletionConfirmed(
    user: { email: string; passwordHash: string | null },
    dto: DeleteAccountDto
  ) {
    if (user.passwordHash) {
      if (!dto.password) {
        throw new BadRequestException({
          code: 'PASSWORD_REQUIRED',
          message: 'Enter your password to delete the account',
        });
      }
      if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
        throw new ForbiddenException({
          code: 'INVALID_CREDENTIALS',
          message: 'Password is incorrect',
        });
      }
      return;
    }
    if (dto.confirmEmail?.trim().toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException({
        code: 'EMAIL_CONFIRMATION_REQUIRED',
        message: 'Type the e-mail address of the account to delete it',
      });
    }
  }
}
