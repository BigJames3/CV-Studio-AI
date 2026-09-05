import { IS_PUBLIC_KEY } from '../../common/decorators';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

describe('PlansController', () => {
  const plans = { findAll: jest.fn() };
  const controller = new PlansController(plans as unknown as PlansService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /plans is @Public', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PlansController.prototype.list)).toBe(true);
  });

  it('returns the catalog from PlansService', async () => {
    const catalog = { items: [{ slug: 'pro', priceMonthly: 9.99 }] };
    plans.findAll.mockResolvedValue(catalog);
    await expect(controller.list()).resolves.toEqual(catalog);
    expect(plans.findAll).toHaveBeenCalled();
  });
});
