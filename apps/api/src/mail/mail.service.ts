import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: nodemailer.Transporter;
  private readonly from: string;
  private readonly appUrl: string;

  constructor() {
    this.from = process.env.MAIL_FROM ?? 'CV Studio AI <noreply@cvstudio.local>';
    this.appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  }

  async onModuleInit() {
    const host = process.env.SMTP_HOST ?? 'localhost';
    const port = Number(process.env.SMTP_PORT ?? 1025);
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      tls: { rejectUnauthorized: false },
    });
    try {
      await this.transporter.verify();
      this.logger.log(`SMTP ready ${host}:${port}`);
    } catch (err) {
      this.logger.warn(
        `SMTP unavailable (${host}:${port}) — emails will be logged only: ${(err as Error).message}`
      );
    }
  }

  async send(options: { to: string; subject: string; html: string; text?: string }) {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (err) {
      this.logger.warn(`Failed to send mail to ${options.to}: ${(err as Error).message}`);
      this.logger.debug(`Mail fallback subject=${options.subject} text=${options.text ?? ''}`);
    }
  }

  async sendEmailVerification(to: string, token: string) {
    const url = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Verify your CV Studio AI email',
      text: `Verify your email: ${url}`,
      html: `<p>Welcome to CV Studio AI.</p><p><a href="${url}">Verify your email</a></p><p>Or paste: ${url}</p>`,
    });
  }

  async sendPasswordReset(to: string, token: string) {
    const url = `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Reset your CV Studio AI password',
      text: `Reset your password: ${url}`,
      html: `<p>Password reset requested.</p><p><a href="${url}">Reset password</a></p><p>Link expires in 1 hour.</p>`,
    });
  }

  async sendPaymentFailed(
    to: string,
    opts: { amount: number; currency: string; retryDate: Date | null }
  ) {
    const amountLabel = `${opts.amount.toFixed(2)} ${opts.currency}`;
    const retryLine = opts.retryDate
      ? `Next retry: ${opts.retryDate.toISOString()}`
      : 'Please update your payment method to avoid interruption.';
    const billingUrl = `${this.appUrl}/account/billing`;
    await this.send({
      to,
      subject: 'Payment failed — CV Studio AI',
      text: `Your payment of ${amountLabel} failed. ${retryLine} Manage billing: ${billingUrl}`,
      html: `<p>Your payment of <strong>${amountLabel}</strong> failed.</p><p>${retryLine}</p><p><a href="${billingUrl}">Update billing</a></p>`,
    });
  }

  async sendSubscriptionCancelScheduled(to: string, opts: { plan: string; accessUntil: Date }) {
    const dateLabel = opts.accessUntil.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const billingUrl = `${this.appUrl}/account/billing`;
    await this.send({
      to,
      subject: 'Annulation programmée — CV Studio AI',
      text: `Votre abonnement ${opts.plan} est annulé. Accès jusqu'au ${dateLabel}. Réactivez ici: ${billingUrl}`,
      html: `<p>Votre abonnement <strong>${opts.plan}</strong> est programmé pour annulation.</p><p>Vous conservez l'accès jusqu'au <strong>${dateLabel}</strong>.</p><p><a href="${billingUrl}">Gérer ou réactiver</a></p>`,
    });
  }

  async sendSubscriptionReactivated(to: string, opts: { plan: string }) {
    const billingUrl = `${this.appUrl}/account/billing`;
    await this.send({
      to,
      subject: 'Abonnement réactivé — CV Studio AI',
      text: `Votre abonnement ${opts.plan} est à nouveau actif et se renouvellera automatiquement. ${billingUrl}`,
      html: `<p>Votre abonnement <strong>${opts.plan}</strong> a été réactivé.</p><p>Le renouvellement automatique est rétabli.</p><p><a href="${billingUrl}">Voir la facturation</a></p>`,
    });
  }
}
