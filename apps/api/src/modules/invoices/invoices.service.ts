import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import Stripe from 'stripe';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';

export type InvoiceListDto = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  paidAt: string | null;
  dueDate: string;
  createdAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  source: 'stripe' | 'db';
};

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key && !key.includes('xxx')) {
      this.stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    }
  }

  async list(userId: string, limit = 12): Promise<{ items: InvoiceListDto[] }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { stripeCustomerId: true },
    });
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });

    if (user?.stripeCustomerId && this.stripe) {
      try {
        const stripeItems = await this.listFromStripe(user.stripeCustomerId, limit);
        if (sub) {
          await this.syncStripeInvoicesToDb(stripeItems, sub.id);
        }
        if (stripeItems.length > 0) {
          return { items: stripeItems };
        }
      } catch (err) {
        this.logger.warn(
          `Stripe invoices fetch failed for user ${userId}: ${(err as Error).message}`
        );
      }
    }

    if (!sub) return { items: [] };

    const items = await this.prisma.invoice.findMany({
      where: { subscriptionId: sub.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      items: items.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        status: invoice.status,
        pdfUrl: invoice.pdfUrl,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        dueDate: invoice.dueDate.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
        periodStart: null,
        periodEnd: null,
        source: 'db' as const,
      })),
    };
  }

  async get(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { subscription: true },
    });
    if (!invoice) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Invoice not found' });
    if (invoice.subscription.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your invoice' });
    }
    return invoice;
  }

  async download(userId: string, id: string) {
    const invoice = await this.get(userId, id);
    return {
      url: invoice.pdfUrl ?? null,
      invoiceNumber: invoice.invoiceNumber,
      message: invoice.pdfUrl ? undefined : 'PDF not generated yet',
    };
  }

  private async listFromStripe(customerId: string, limit: number): Promise<InvoiceListDto[]> {
    const invoices = await this.stripe!.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data
      .map((invoice) => {
        const created = new Date((invoice.created ?? 0) * 1000);
        return {
          id: invoice.id,
          invoiceNumber: invoice.number ?? `INV-${invoice.id}`,
          amount: (invoice.amount_paid ?? invoice.total ?? 0) / 100,
          currency: (invoice.currency ?? 'usd').toUpperCase(),
          status: this.mapStripeStatus(invoice.status),
          pdfUrl: invoice.invoice_pdf ?? null,
          paidAt: invoice.status === 'paid' ? created.toISOString() : null,
          dueDate: created.toISOString(),
          createdAt: created.toISOString(),
          periodStart: invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString()
            : null,
          periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          source: 'stripe' as const,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private async syncStripeInvoicesToDb(
    items: InvoiceListDto[],
    subscriptionId: string
  ): Promise<void> {
    for (const item of items) {
      const status = this.toPrismaStatus(item.status);
      await this.prisma.invoice.upsert({
        where: { invoiceNumber: item.invoiceNumber },
        create: {
          subscriptionId,
          invoiceNumber: item.invoiceNumber,
          amount: item.amount,
          currency: item.currency,
          status,
          pdfUrl: item.pdfUrl ?? undefined,
          dueDate: new Date(item.dueDate),
          paidAt: item.paidAt ? new Date(item.paidAt) : null,
        },
        update: {
          amount: item.amount,
          currency: item.currency,
          status,
          pdfUrl: item.pdfUrl ?? undefined,
          paidAt: item.paidAt ? new Date(item.paidAt) : null,
        },
      });
    }
  }

  private mapStripeStatus(status: Stripe.Invoice.Status | null): string {
    switch (status) {
      case 'paid':
        return 'paid';
      case 'open':
        return 'sent';
      case 'void':
        return 'void';
      case 'uncollectible':
        return 'uncollectible';
      case 'draft':
      default:
        return status ?? 'draft';
    }
  }

  private toPrismaStatus(status: string): InvoiceStatus {
    const allowed: InvoiceStatus[] = ['draft', 'sent', 'paid', 'void', 'uncollectible'];
    return (allowed.includes(status as InvoiceStatus) ? status : 'draft') as InvoiceStatus;
  }
}
