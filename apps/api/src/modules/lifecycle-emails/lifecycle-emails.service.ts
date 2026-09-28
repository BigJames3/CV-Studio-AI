import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';
import { MailService } from '../../mail/mail.service';
import { appOriginFromEnv } from '../../common/utils/url.utils';
import {
  LIFECYCLE_EMAIL_TYPES,
  renderLifecycleEmail,
  type LifecycleEmailContext,
  type LifecycleEmailType,
} from './lifecycle-email.templates';
import { signUnsubscribe } from './unsubscribe-token';

const DAY = 24 * 60 * 60 * 1000;
/** Minimum gap between two reminder e-mails to the same person. */
export const LIFECYCLE_MIN_GAP_DAYS = 3;
/** Per type and per run: a daily run spreads a large backlog over several days. */
export const LIFECYCLE_BATCH_SIZE = 500;

type Candidate = {
  id: string;
  email: string;
  firstName: string;
  context?: Partial<LifecycleEmailContext>;
};

/**
 * Reminder and tip e-mails, sent once a day (LifecycleEmailsJob):
 * - trial_ending: 2–4 days before a trial ends (billing notice: ignores the opt-out);
 * - cv_unfinished: 1–7 days after sign-up, no CV or no CV with a summary and an experience;
 * - ats_tip: 3–14 days after sign-up, has a started CV but never ran the ATS check;
 * - reactivation: no login for 30 days, has a CV.
 * Each type goes at most once per user, reminders are at least 3 days apart, a user gets at most
 * one e-mail per run, and only verified, non-deleted accounts are contacted.
 */
@Injectable()
export class LifecycleEmailsService {
  private readonly logger = new Logger(LifecycleEmailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService
  ) {}

  async runDaily(now = new Date()): Promise<Record<LifecycleEmailType, number>> {
    const sent = Object.fromEntries(LIFECYCLE_EMAIL_TYPES.map((t) => [t, 0])) as Record<
      LifecycleEmailType,
      number
    >;
    const contacted = new Set<string>();

    for (const type of LIFECYCLE_EMAIL_TYPES) {
      const candidates = await this.candidates(type, now);
      for (const candidate of candidates) {
        if (contacted.has(candidate.id)) continue;
        if (await this.deliver(type, candidate, now)) {
          sent[type] += 1;
          contacted.add(candidate.id);
        }
      }
    }
    this.logger.log(`Lifecycle e-mails sent: ${JSON.stringify(sent)}`);
    return sent;
  }

  private base(type: LifecycleEmailType, now: Date, billingNotice = false) {
    return {
      deletedAt: null,
      ...(billingNotice ? {} : { isEmailVerified: true, lifecycleEmailsOptOut: false }),
      lifecycleEmails: {
        none: billingNotice
          ? { type }
          : {
              OR: [
                { type },
                { sentAt: { gte: new Date(now.getTime() - LIFECYCLE_MIN_GAP_DAYS * DAY) } },
              ],
            },
      },
    } satisfies Prisma.UserWhereInput;
  }

  private async candidates(type: LifecycleEmailType, now: Date): Promise<Candidate[]> {
    const select = { id: true, email: true, firstName: true } as const;
    const ago = (days: number) => new Date(now.getTime() - days * DAY);
    const liveCv = { deletedAt: null } as const;

    switch (type) {
      case 'trial_ending': {
        const users = await this.prisma.user.findMany({
          where: {
            ...this.base(type, now, true),
            subscription: {
              status: 'trialing',
              cancelAtPeriodEnd: false,
              currentPeriodEnd: {
                gte: new Date(now.getTime() + 2 * DAY),
                lte: new Date(now.getTime() + 4 * DAY),
              },
            },
          },
          select: {
            ...select,
            subscription: {
              select: {
                currentPeriodEnd: true,
                plan: { select: { name: true } },
              },
            },
          },
          take: LIFECYCLE_BATCH_SIZE,
        });
        return users.map((u) => ({
          ...u,
          context: {
            planName: u.subscription?.plan.name,
            trialEnd: u.subscription?.currentPeriodEnd,
          },
        }));
      }
      case 'cv_unfinished': {
        const users = await this.prisma.user.findMany({
          where: { ...this.base(type, now), createdAt: { gte: ago(7), lte: ago(1) } },
          select: { ...select, cvs: { where: liveCv, select: { content: true } } },
          take: LIFECYCLE_BATCH_SIZE,
        });
        return users
          .filter((u) => !u.cvs.some((cv) => isCvStarted(cv.content)))
          .map((u) => ({ ...u, context: { hasCv: u.cvs.length > 0 } }));
      }
      case 'ats_tip': {
        const users = await this.prisma.user.findMany({
          where: {
            ...this.base(type, now),
            createdAt: { gte: ago(14), lte: ago(3) },
            cvs: { some: liveCv, none: { atsReports: { some: {} } } },
          },
          select: { ...select, cvs: { where: liveCv, select: { content: true } } },
          take: LIFECYCLE_BATCH_SIZE,
        });
        // An ATS check on an empty CV is pointless: the unfinished-CV reminder covers those.
        return users.filter((u) => u.cvs.some((cv) => isCvStarted(cv.content)));
      }
      case 'reactivation':
        return this.prisma.user.findMany({
          where: {
            ...this.base(type, now),
            createdAt: { lte: ago(30) },
            cvs: { some: liveCv },
            OR: [{ lastLoginAt: { lte: ago(30) } }, { lastLoginAt: null }],
          },
          select,
          take: LIFECYCLE_BATCH_SIZE,
        });
    }
  }

  /** Sends, then records the send; the unique (user, type) row stops a concurrent duplicate. */
  private async deliver(
    type: LifecycleEmailType,
    candidate: Candidate,
    now: Date
  ): Promise<boolean> {
    const appUrl = appOriginFromEnv();
    const token = signUnsubscribe(candidate.id);
    const query = `u=${encodeURIComponent(candidate.id)}&t=${encodeURIComponent(token)}`;
    const unsubscribeUrl = `${appUrl}/desinscription?${query}`;
    const apiUrl = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
    const oneClickUrl = `${apiUrl}/api/v1/emails/unsubscribe?${query}`;

    try {
      // sentAt on the run's clock: the 3-day gap is measured against the same `now`.
      await this.prisma.lifecycleEmail.create({
        data: { userId: candidate.id, type, sentAt: now },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false; // another pod already sent it
      }
      throw error;
    }

    const email = renderLifecycleEmail(type, {
      firstName: candidate.firstName,
      appUrl,
      unsubscribeUrl,
      ...candidate.context,
    });
    const ok = await this.mail.send({
      to: candidate.email,
      ...email,
      headers:
        type === 'trial_ending'
          ? undefined
          : {
              // RFC 8058 one-click unsubscribe (Gmail / Yahoo bulk-sender requirement).
              'List-Unsubscribe': `<${oneClickUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
    });
    if (!ok) {
      // Not handed to SMTP: forget it so a later run retries.
      await this.prisma.lifecycleEmail.deleteMany({ where: { userId: candidate.id, type } });
    }
    return ok;
  }

  async unsubscribe(userId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId, deletedAt: null },
      data: { lifecycleEmailsOptOut: true },
    });
  }
}

/** A CV counts as started once it has a summary and at least one experience. */
export function isCvStarted(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false;
  const c = content as { summary?: { text?: unknown } | string; experiences?: unknown };
  const summary = typeof c.summary === 'string' ? c.summary : c.summary?.text;
  return (
    typeof summary === 'string' &&
    summary.trim().length > 0 &&
    Array.isArray(c.experiences) &&
    c.experiences.length > 0
  );
}
