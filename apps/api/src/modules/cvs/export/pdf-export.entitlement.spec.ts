import { ForbiddenException } from '@nestjs/common';
import { PdfExportService } from './pdf-export.service';

describe('PdfExportService entitlements', () => {
  const prisma = { cv: { findFirst: jest.fn() } };
  const redis = {};
  const entitlements = { can: jest.fn() };
  const generator = { htmlToPdf: jest.fn() };

  let service: PdfExportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PdfExportService(
      prisma as never,
      redis as never,
      entitlements as never,
      generator as never
    );
  });

  it('denies free user sync PDF with ENTITLEMENT_REQUIRED', async () => {
    entitlements.can.mockResolvedValue(false);
    await expect(service.renderFromContent({}, {}, 'u-free')).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('calls entitlement check for pro users before generating', async () => {
    entitlements.can.mockResolvedValue(true);
    generator.htmlToPdf.mockResolvedValue(Buffer.from('%PDF'));
    await expect(
      service.renderFromContent({}, { html: '<html><body>CV</body></html>' }, 'u-pro')
    ).resolves.toEqual(expect.objectContaining({ buffer: expect.any(Buffer) }));
    expect(entitlements.can).toHaveBeenCalledWith('u-pro', 'cv:export:pdf');
  });

  it('denies free user async enqueue', async () => {
    entitlements.can.mockResolvedValue(false);
    await expect(service.enqueueFromCvId('u-free', 'cv-1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ENTITLEMENT_REQUIRED' }),
    });
  });

  it('loads CV after entitlement passes for enqueue', async () => {
    entitlements.can.mockResolvedValue(true);
    prisma.cv.findFirst.mockResolvedValue(null);
    await expect(service.enqueueFromCvId('u-pro', 'missing')).rejects.toBeDefined();
    expect(prisma.cv.findFirst).toHaveBeenCalled();
  });
});
