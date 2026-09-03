import { Test } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '../../common/decorators';
import { GeoController } from './geo.controller';

describe('GeoController', () => {
  let controller: GeoController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GeoController],
    }).compile();
    controller = module.get(GeoController);
  });

  it('is not public (JWT required via global guard)', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, GeoController)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, GeoController.prototype.getCountry)).toBeUndefined();
  });

  describe('getCountry', () => {
    it('should extract country from CF-IPCountry header', () => {
      const result = controller.getCountry({
        headers: { 'cf-ipcountry': 'SN' },
      } as never);

      expect(result.country).toBe('SN');
      expect(result.source).toBe('ip');
    });

    it('should extract country from X-Country header', () => {
      const result = controller.getCountry({
        headers: { 'x-country': 'US' },
      } as never);

      expect(result.country).toBe('US');
      expect(result.source).toBe('ip');
    });

    it('should return null if no geo header present', () => {
      const result = controller.getCountry({ headers: {} } as never);

      expect(result.country).toBeNull();
      expect(result.source).toBe('unknown');
    });

    it('should prioritize CF-IPCountry over X-Country', () => {
      const result = controller.getCountry({
        headers: {
          'cf-ipcountry': 'SN',
          'x-country': 'US',
        },
      } as never);

      expect(result.country).toBe('SN');
    });
  });
});
