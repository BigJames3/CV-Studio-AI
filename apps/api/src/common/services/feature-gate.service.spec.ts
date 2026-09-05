import { FeatureGateService } from './feature-gate.service';

const free = { id: 'u-free', subscriptionTier: 'free' as const };
const pro = { id: 'u-pro', subscriptionTier: 'pro' as const };
const business = { id: 'u-biz', subscriptionTier: 'business' as const };

describe('FeatureGateService', () => {
  let service: FeatureGateService;

  beforeEach(() => {
    service = new FeatureGateService();
  });

  describe('canCreateCV', () => {
    it('should allow free user to create 1 CV', () => {
      expect(service.canCreateCV(free, 0)).toBe(true);
    });

    it('should deny free user 2nd CV', () => {
      expect(service.canCreateCV(free, 1)).toBe(false);
    });

    it('should deny free user when already over limit', () => {
      expect(service.canCreateCV(free, 2)).toBe(false);
    });

    it('should allow pro user unlimited CVs', () => {
      expect(service.canCreateCV(pro, 1000)).toBe(true);
    });

    it('should allow business user unlimited CVs', () => {
      expect(service.canCreateCV(business, 1000)).toBe(true);
    });

    it('should treat missing tier as free', () => {
      expect(service.canCreateCV({ subscriptionTier: undefined }, 1)).toBe(false);
    });
  });

  describe('canDownloadPDF', () => {
    it('should deny free user', () => {
      expect(service.canDownloadPDF(free)).toBe(false);
    });

    it('should allow pro user', () => {
      expect(service.canDownloadPDF(pro)).toBe(true);
    });

    it('should allow business user', () => {
      expect(service.canDownloadPDF(business)).toBe(true);
    });
  });

  describe('canPrint', () => {
    it('should deny free user', () => {
      expect(service.canPrint(free)).toBe(false);
    });

    it('should allow pro user', () => {
      expect(service.canPrint(pro)).toBe(true);
    });

    it('should allow business user', () => {
      expect(service.canPrint(business)).toBe(true);
    });
  });

  describe('canShare', () => {
    it('should deny free user', () => {
      expect(service.canShare(free)).toBe(false);
    });

    it('should allow pro user', () => {
      expect(service.canShare(pro)).toBe(true);
    });

    it('should allow business user', () => {
      expect(service.canShare(business)).toBe(true);
    });
  });

  describe('canAccessProTemplates', () => {
    it('should deny free user', () => {
      expect(service.canAccessProTemplates(free)).toBe(false);
    });

    it('should deny pro user (matrix: Pro templates are Business-only)', () => {
      expect(service.canAccessProTemplates(pro)).toBe(false);
    });

    it('should allow business user', () => {
      expect(service.canAccessProTemplates(business)).toBe(true);
    });
  });

  describe('canAccessBusinessTemplates', () => {
    it('should deny free user', () => {
      expect(service.canAccessBusinessTemplates(free)).toBe(false);
    });

    it('should deny pro user', () => {
      expect(service.canAccessBusinessTemplates(pro)).toBe(false);
    });

    it('should allow business user', () => {
      expect(service.canAccessBusinessTemplates(business)).toBe(true);
    });
  });

  describe('canAccessAdvancedFeatures', () => {
    it('should deny free user', () => {
      expect(service.canAccessAdvancedFeatures(free)).toBe(false);
    });

    it('should allow pro user', () => {
      expect(service.canAccessAdvancedFeatures(pro)).toBe(true);
    });

    it('should allow business user', () => {
      expect(service.canAccessAdvancedFeatures(business)).toBe(true);
    });
  });

  describe('getAvailableTemplateTypes', () => {
    it('should return free templates for free tier', () => {
      expect(service.getAvailableTemplateTypes(free)).toEqual(['free']);
    });

    it('should return free templates for pro tier', () => {
      expect(service.getAvailableTemplateTypes(pro)).toEqual(['free']);
    });

    it('should return all template types for business tier', () => {
      expect(service.getAvailableTemplateTypes(business)).toEqual(['free', 'pro', 'business']);
    });
  });

  describe('canAccessTemplate', () => {
    it('should allow free templates for every tier', () => {
      expect(service.canAccessTemplate(free, { isPremium: false })).toBe(true);
      expect(service.canAccessTemplate(pro, { isPremium: false })).toBe(true);
      expect(service.canAccessTemplate(business, { isPremium: false })).toBe(true);
    });

    it('should deny premium/pro templates for free and pro', () => {
      expect(service.canAccessTemplate(free, { isPremium: true })).toBe(false);
      expect(service.canAccessTemplate(pro, { isPremium: true })).toBe(false);
    });

    it('should allow premium templates for business', () => {
      expect(service.canAccessTemplate(business, { isPremium: true })).toBe(true);
      expect(service.canAccessTemplate(business, { accessTier: 'business' })).toBe(true);
    });
  });
});
