import { EntitlementsService } from './entitlements.service';
import { FeatureGateService } from '../../common/services/feature-gate.service';

describe('EntitlementsService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    cv: { count: jest.fn() },
  };
  const featureGate = new FeatureGateService();
  let service: EntitlementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EntitlementsService(prisma as never, featureGate);
  });

  function mockUser(tier: 'free' | 'pro' | 'business') {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: tier });
  }

  describe('cv:create', () => {
    it('allows free user with 0 CVs', async () => {
      mockUser('free');
      prisma.cv.count.mockResolvedValue(0);
      await expect(service.can('u1', 'cv:create')).resolves.toBe(true);
    });

    it('denies free user at 1 CV', async () => {
      mockUser('free');
      prisma.cv.count.mockResolvedValue(1);
      await expect(service.can('u1', 'cv:create')).resolves.toBe(false);
    });

    it('allows pro user with many CVs', async () => {
      mockUser('pro');
      prisma.cv.count.mockResolvedValue(50);
      await expect(service.can('u1', 'cv:create')).resolves.toBe(true);
    });
  });

  describe('cv:export:pdf', () => {
    it('denies free', async () => {
      mockUser('free');
      await expect(service.can('u1', 'cv:export:pdf')).resolves.toBe(false);
    });

    it('allows pro and business', async () => {
      mockUser('pro');
      await expect(service.can('u1', 'cv:export:pdf')).resolves.toBe(true);
      mockUser('business');
      await expect(service.can('u1', 'downloadPDF')).resolves.toBe(true);
    });
  });

  describe('cv:share', () => {
    it('denies free and allows paid', async () => {
      mockUser('free');
      await expect(service.can('u1', 'cv:share')).resolves.toBe(false);
      mockUser('pro');
      await expect(service.can('u1', 'share')).resolves.toBe(true);
    });
  });

  describe('templates', () => {
    it('denies pro templates for pro tier', async () => {
      mockUser('pro');
      await expect(service.can('u1', 'proTemplates')).resolves.toBe(false);
    });

    it('allows pro and business templates for business tier', async () => {
      mockUser('business');
      await expect(service.can('u1', 'proTemplates')).resolves.toBe(true);
      await expect(service.can('u1', 'businessTemplates')).resolves.toBe(true);
    });
  });

  describe('legacy AI matrix', () => {
    it('allows ATS teaser for free', async () => {
      mockUser('free');
      await expect(service.can('u1', 'ai:ats')).resolves.toBe(true);
    });

    it('denies AI generate for free', async () => {
      mockUser('free');
      await expect(service.can('u1', 'ai:generate')).resolves.toBe(false);
    });
  });
});
