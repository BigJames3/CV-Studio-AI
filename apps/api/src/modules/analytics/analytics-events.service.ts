import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  captureServerEvent,
  captureServerIdentify,
  shutdownPostHog,
} from '../../lib/analytics/posthog-server';

@Injectable()
export class AnalyticsEventsService implements OnModuleDestroy {
  constructor(private readonly analytics: AnalyticsService) {}

  async onModuleDestroy() {
    await shutdownPostHog();
  }

  private persist(userId: string, event: string, properties?: Record<string, unknown>) {
    void this.analytics
      .track(userId, { event, properties, platform: 'server' })
      .catch(() => undefined);
  }

  trackSignup(
    userId: string,
    email: string,
    method: 'password' | 'google' | 'linkedin' = 'password'
  ) {
    this.persist(userId, 'signup_succeeded', { email, method });
    captureServerIdentify(userId, { email, plan: 'free', method });
  }

  trackEmailVerified(userId: string) {
    this.persist(userId, 'email_verified');
  }

  trackLoginSucceeded(userId: string, email: string, plan?: string) {
    this.persist(userId, 'login_succeeded', { email });
    captureServerIdentify(userId, { email, plan: plan ?? 'free' });
  }

  trackLoginFailed(distinctId: string, reason?: string) {
    captureServerEvent(distinctId, 'login_failed', { reason });
  }

  trackLogout(userId: string) {
    this.persist(userId, 'logout');
  }

  trackCVCreated(userId: string, cvId: string) {
    this.persist(userId, 'cv_created', { cvId });
  }

  trackCVEdited(userId: string, cvId: string) {
    this.persist(userId, 'cv_edited', { cvId });
  }

  trackCVDeleted(userId: string, cvId: string) {
    this.persist(userId, 'cv_deleted', { cvId });
  }

  trackCVDuplicated(userId: string, cvId: string) {
    this.persist(userId, 'cv_duplicated', { cvId });
  }

  trackCVStarred(userId: string, cvId: string, starred: boolean) {
    this.persist(userId, starred ? 'cv_starred' : 'cv_unstarred', { cvId });
  }

  trackUpgradeClicked(userId: string, plan: 'pro' | 'business', interval?: string) {
    this.persist(userId, 'checkout_started', { plan, interval });
    this.persist(userId, 'upgrade_clicked', { plan, interval });
  }

  trackUpgradeCompleted(userId: string, plan: string, amount?: number) {
    this.persist(userId, 'checkout_succeeded', { plan, amount });
    this.persist(userId, 'upgrade_completed', { plan, amount });
    captureServerIdentify(userId, { plan });
  }

  trackPaymentCompleted(userId: string, amount: number, currency: string) {
    this.persist(userId, 'payment_completed', { amount, currency });
    this.persist(userId, 'invoice_paid', { amount, currency });
  }

  trackSubscriptionCanceled(userId: string, plan: string) {
    this.persist(userId, 'subscription_canceled', { plan });
  }

  trackSubscriptionReactivated(userId: string, plan: string) {
    this.persist(userId, 'subscription_reactivated', { plan });
    captureServerIdentify(userId, { plan });
  }

  trackPortalAccessed(userId: string) {
    this.persist(userId, 'portal_accessed');
  }

  trackSettingsUpdated(userId: string, setting: string) {
    this.persist(userId, 'settings_updated', { setting });
  }

  trackStripeWebhookFailed(eventType: string, error: string, userId?: string) {
    captureServerEvent(userId || 'system', 'stripe_webhook_failed', {
      eventType,
      error: error.slice(0, 500),
    });
  }

  trackError(userId: string | null, error: Error, context?: string) {
    captureServerEvent(userId || 'anonymous', 'error_occurred', {
      error: error.message.slice(0, 500),
      context,
    });
  }
}
