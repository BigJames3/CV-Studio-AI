import { ForbiddenException } from '@nestjs/common';
import { CvsController } from './cvs.controller';
import { FeatureGateService } from '../../common/services/feature-gate.service';
import { FEATURE_GATE_KEY } from '../../common/decorators';
import { RequireFeature } from '../../common/decorators';

describe('CvsController feature gates', () => {
  const cvs = {
    countByUser: jest.fn(),
    create: jest.fn(),
    shareMeta: jest.fn(),
    exportPdf: jest.fn(),
  };
  const featureGate = new FeatureGateService();
  let controller: CvsController;

  const free = { id: 'u-free', email: 'f@x.com', subscriptionTier: 'free' as const, roles: [] };
  const pro = { id: 'u-pro', email: 'p@x.com', subscriptionTier: 'pro' as const, roles: [] };
  const business = {
    id: 'u-biz',
    email: 'b@x.com',
    subscriptionTier: 'business' as const,
    roles: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cvs.create.mockResolvedValue({ id: 'cv-1' });
    controller = new CvsController(cvs as never, featureGate);
  });

  describe('POST /cvs create', () => {
    it('allows free user with 0 CVs', async () => {
      cvs.countByUser.mockResolvedValue(0);
      await expect(controller.create(free, { title: 'First' } as never)).resolves.toEqual({
        id: 'cv-1',
      });
    });

    it('denies free user with 1 CV', async () => {
      cvs.countByUser.mockResolvedValue(1);
      await expect(controller.create(free, { title: 'Second' } as never)).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(cvs.create).not.toHaveBeenCalled();
    });

    it('allows pro user with many CVs', async () => {
      cvs.countByUser.mockResolvedValue(1000);
      await controller.create(pro, { title: 'N' } as never);
      expect(cvs.create).toHaveBeenCalled();
    });

    it('allows business user with many CVs', async () => {
      cvs.countByUser.mockResolvedValue(1000);
      await controller.create(business, { title: 'N' } as never);
      expect(cvs.create).toHaveBeenCalled();
    });
  });

  describe('decorator metadata', () => {
    it('gates share behind FeatureGate share', () => {
      const meta = Reflect.getMetadata(FEATURE_GATE_KEY, CvsController.prototype.share) as string;
      expect(meta).toBe('share');
    });

    it('gates async PDF export behind downloadPDF', () => {
      const meta = Reflect.getMetadata(
        FEATURE_GATE_KEY,
        CvsController.prototype.exportPdf
      ) as string;
      expect(meta).toBe('downloadPDF');
    });
  });
});

describe('RequireFeature helper', () => {
  it('stores feature name in metadata', () => {
    class T {
      @RequireFeature('print')
      run() {
        return true;
      }
    }
    expect(Reflect.getMetadata(FEATURE_GATE_KEY, T.prototype.run)).toBe('print');
  });
});
