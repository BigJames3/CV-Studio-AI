import { Test } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '../../common/decorators';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

describe('PlansController', () => {
  const plansService = { findAll: jest.fn() };
  let controller: PlansController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [{ provide: PlansService, useValue: plansService }],
    }).compile();
    controller = module.get(PlansController);
  });

  it('GET /plans is public', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PlansController.prototype.list)).toBe(true);
  });

  it('returns the catalog from PlansService', async () => {
    const catalog = [{ id: 'pro', name: 'Pro' }];
    plansService.findAll.mockResolvedValue(catalog);
    await expect(controller.list()).resolves.toBe(catalog);
    expect(plansService.findAll).toHaveBeenCalledTimes(1);
  });
});
