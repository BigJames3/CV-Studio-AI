import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  const prisma = {
    subscription: { findUnique: jest.fn() },
    invoice: { findMany: jest.fn(), findUnique: jest.fn() },
  };
  let service: InvoicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvoicesService(prisma as never);
  });

  it('list returns empty items when the user has no subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    await expect(service.list('user-1')).resolves.toEqual({ items: [] });
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });

  it('download returns null url when the PDF is not generated yet', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-001',
      pdfUrl: null,
      subscription: { userId: 'user-1' },
    });

    await expect(service.download('user-1', 'inv-1')).resolves.toEqual({
      url: null,
      invoiceNumber: 'INV-001',
      message: 'PDF not generated yet',
    });
  });

  it('download returns the pdf url when present', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      invoiceNumber: 'INV-001',
      pdfUrl: 'https://files.stripe.com/inv.pdf',
      subscription: { userId: 'user-1' },
    });

    await expect(service.download('user-1', 'inv-1')).resolves.toEqual({
      url: 'https://files.stripe.com/inv.pdf',
      invoiceNumber: 'INV-001',
      message: undefined,
    });
  });

  it('get forbids another user invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      subscription: { userId: 'other-user' },
    });
    await expect(service.get('user-1', 'inv-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('get throws when the invoice is missing', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);
    await expect(service.get('user-1', 'inv-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
