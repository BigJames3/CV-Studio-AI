import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

type UpgradePlan = 'pro' | 'business';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly replyTo: string;
  private readonly appUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey && !apiKey.includes('xxx') ? new Resend(apiKey) : null;
    this.fromEmail =
      process.env.RESEND_FROM ?? process.env.MAIL_FROM ?? 'CV Studio AI <noreply@cvstudio.ai>';
    this.replyTo = process.env.RESEND_REPLY_TO ?? 'support@cvstudio.ai';
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000';

    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY missing — transactional marketing emails will be logged only'
      );
    }
  }

  /** Welcome email after signup */
  async sendWelcomeEmail(email: string, name: string) {
    const subject = 'Welcome to CV Studio AI!';
    const html = this.getWelcomeEmailTemplate(name);
    return this.dispatch('welcome', email, subject, html);
  }

  /** Upgrade confirmation after Stripe checkout.session.completed */
  async sendUpgradeConfirmationEmail(
    email: string,
    name: string,
    plan: UpgradePlan,
    invoiceNumber: string,
    amountCents: number,
    currency: string,
    nextBillingDate: Date
  ) {
    const planLabel = plan === 'pro' ? 'Pro' : 'Business';
    const subject = `Payment Confirmed — Welcome to CV Studio ${planLabel}!`;
    const html = this.getUpgradeConfirmationTemplate({
      name,
      plan,
      invoiceNumber,
      amountCents,
      currency,
      nextBillingDate,
    });
    return this.dispatch(`upgrade:${plan}`, email, subject, html);
  }

  /** Expiration reminder (~7 days before period end) */
  async sendExpirationReminderEmail(
    email: string,
    name: string,
    plan: string,
    expirationDate: Date,
    daysRemaining: number
  ) {
    const subject = `Your CV Studio ${plan} plan expires in ${daysRemaining} days`;
    const html = this.getExpirationReminderTemplate({
      name,
      plan,
      expirationDate,
      daysRemaining,
    });
    return this.dispatch('expiration-reminder', email, subject, html);
  }

  /** Reactivation confirmation */
  async sendReactivationConfirmationEmail(email: string, name: string, plan: string) {
    const subject = 'Your subscription has been reactivated';
    const html = this.getReactivationTemplate({ name, plan });
    return this.dispatch('reactivation', email, subject, html);
  }

  private async dispatch(kind: string, to: string, subject: string, html: string) {
    if (process.env.NODE_ENV === 'development' && process.env.EMAIL_DRY_RUN === '1') {
      this.logger.log(`[DEV] Would send ${kind} email to ${to}: ${subject}`);
      return { success: true, messageId: 'dev-mode' };
    }

    if (!this.resend) {
      this.logger.log(`[no-resend] ${kind} → ${to}: ${subject}`);
      return { success: true, messageId: 'logged-only' };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
        replyTo: this.replyTo,
      });

      if (error) {
        this.logger.error(`Failed to send ${kind} email to ${to}: ${error.message}`);
        return { success: false, error };
      }

      this.logger.log(`${kind} email sent to ${to} id=${data?.id ?? 'unknown'}`);
      return { success: true, messageId: data?.id };
    } catch (error) {
      this.logger.error(`Failed to send ${kind} email to ${to}`, error as Error);
      return { success: false, error };
    }
  }

  // ──────────── HTML templates (new — do not touch MailService) ────────────

  private getWelcomeEmailTemplate(name: string): string {
    const dashboardUrl = `${this.appUrl}/dashboard`;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #0f766e 100%); color: white; padding: 28px 20px; text-align: center; border-radius: 8px; }
    .content { padding: 24px 20px; background: #f8fafc; margin: 20px 0; border-radius: 8px; }
    .button { display: inline-block; background: #0f766e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">Welcome to CV Studio AI</h1>
    </div>
    <div class="content">
      <p>Hi ${this.escape(name)},</p>
      <p>Thanks for joining CV Studio AI. Your account is ready.</p>
      <h3>What you can do now</h3>
      <ul>
        <li>Create professional CVs</li>
        <li>Improve content with AI</li>
        <li>Export in multiple formats</li>
      </ul>
      <p><a href="${dashboardUrl}" class="button">Go to Dashboard</a></p>
      <p style="margin-top: 20px; font-size: 14px;">Need help? Reply to this email or contact ${this.replyTo}.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} CV Studio AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getUpgradeConfirmationTemplate(data: {
    name: string;
    plan: string;
    invoiceNumber: string;
    amountCents: number;
    currency: string;
    nextBillingDate: Date;
  }): string {
    const planColor = data.plan === 'pro' ? '#1e3a5f' : '#0f766e';
    const nextBilling = data.nextBillingDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const amount = (data.amountCents / 100).toFixed(2);
    const currency = data.currency.toUpperCase();
    const billingUrl = `${this.appUrl}/account/billing`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${planColor} 0%, #0f766e 100%); color: white; padding: 28px 20px; text-align: center; border-radius: 8px; }
    .plan-badge { display: inline-block; background: white; color: ${planColor}; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
    .invoice-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: ${planColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">Payment confirmed</h1>
      <div class="plan-badge">${this.escape(data.plan.toUpperCase())} PLAN</div>
    </div>
    <div style="padding: 20px; background: #f8fafc; border-radius: 8px; margin-top: 20px;">
      <p>Hi ${this.escape(data.name)},</p>
      <p>Thank you for upgrading to the <strong>${this.escape(data.plan)}</strong> plan. Your account is now active.</p>
      <div class="invoice-box">
        <h3 style="margin-top: 0;">Invoice details</h3>
        <p><strong>Reference:</strong> ${this.escape(data.invoiceNumber)}</p>
        <p><strong>Amount:</strong> ${amount} ${currency}</p>
        <p><strong>Next billing date:</strong> ${nextBilling}</p>
      </div>
      <p><a href="${billingUrl}" class="button">View your account</a></p>
      <p style="margin-top: 20px; font-size: 14px;">Questions? Contact us at ${this.replyTo}</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} CV Studio AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getExpirationReminderTemplate(data: {
    name: string;
    plan: string;
    expirationDate: Date;
    daysRemaining: number;
  }): string {
    const expirationStr = data.expirationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const billingUrl = `${this.appUrl}/account/billing`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .warning-box { background: #fef9c3; border-left: 4px solid #ca8a04; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #0f766e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Your subscription expires soon</h1>
    <div class="warning-box">
      <p><strong>Your ${this.escape(data.plan)} plan expires in ${data.daysRemaining} days</strong></p>
      <p>Expiration date: <strong>${expirationStr}</strong></p>
    </div>
    <p>Hi ${this.escape(data.name)},</p>
    <p>This is a reminder that your CV Studio <strong>${this.escape(data.plan)}</strong> subscription will end soon.</p>
    <h3>What happens when it expires?</h3>
    <ul>
      <li>Your account reverts to the Free plan</li>
      <li>Advanced features will be disabled</li>
    </ul>
    <p><a href="${billingUrl}" class="button">Keep my plan</a></p>
    <p style="margin-top: 30px; font-size: 14px;">Questions? ${this.replyTo}</p>
    <div class="footer">
      <p>© ${new Date().getFullYear()} CV Studio AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getReactivationTemplate(data: { name: string; plan: string }): string {
    const dashboardUrl = `${this.appUrl}/dashboard`;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 28px 20px; text-align: center; border-radius: 8px; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">Welcome back</h1>
    </div>
    <p style="padding: 20px 0 0;">Hi ${this.escape(data.name)},</p>
    <p>Your <strong>${this.escape(data.plan)}</strong> subscription has been reactivated. Premium features are active again.</p>
    <div style="text-align: center; padding: 20px 0;">
      <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
    </div>
  </div>
</body>
</html>`;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
