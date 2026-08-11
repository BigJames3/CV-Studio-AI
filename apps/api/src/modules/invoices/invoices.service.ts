import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return { items: [] };
    const items = await this.prisma.invoice.findMany({
      where: { subscriptionId: sub.id },
      orderBy: { createdAt: 'desc' },
    });
    return { items };
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
}
