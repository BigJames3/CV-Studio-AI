import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { validate } from 'class-validator';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlansService } from '../plans/plans.service';
import { CheckoutDto } from './dto/subscription.dto';
import { IS_PUBLIC_KEY, type AuthUser } from '../../common/decorators';

const user: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  subscriptionTier: 'free',
  roles: [],
};

describe('SubscriptionsController', () => {
  const subscriptions = {
    checkout: jest.fn(),
    me: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  };

  const plans = {
    findAll: jest.fn(),
  };

  let controller: SubscriptionsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        { provide: SubscriptionsService, useValue: subscriptions },
        { provide: PlansService, useValue: plans },
      ],
    }).compile();
    controller = module.get(SubscriptionsController);
  });

  it('POST checkout accepts plan, interval, paymentMethod', async () => {
    subscriptions.checkout.mockResolvedValue({
      url: 'https://checkout.cinetpay.com/payment/tok',
      transactionId: 'cv_abc_1',
      paymentMethod: 'cinetpay',
    });

    const result = await controller.checkout(user, {
      plan: 'pro',
      interval: 'month',
      paymentMethod: 'cinetpay',
    });

    expect(subscriptions.checkout).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ plan: 'pro', interval: 'month', paymentMethod: 'cinetpay' })
    );
    expect(result).toMatchObject({
      url: expect.stringMatching(/cinetpay/),
      transactionId: 'cv_abc_1',
      paymentMethod: 'cinetpay',
    });
  });

  it('POST checkout works without paymentMethod (backward compatible)', async () => {
    subscriptions.checkout.mockResolvedValue({
      url: 'https://checkout.stripe.com/c/pay/cs_test',
    });

    await controller.checkout(user, { plan: 'pro', interval: 'month' });

    expect(subscriptions.checkout).toHaveBeenCalledWith('user-1', {
      plan: 'pro',
      interval: 'month',
    });
  });

  it('POST checkout requires auth (not @Public)', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SubscriptionsController.prototype.checkout)
    ).toBeFalsy();
  });

  it('POST /subscriptions is forbidden for regular users and does not create', () => {
    expect(() => controller.create(user, { plan: 'pro' })).toThrow(ForbiddenException);
    expect(subscriptions.create).not.toHaveBeenCalled();
  });

  it('POST /subscriptions is forbidden for non-admin roles', () => {
    const nonAdmin: AuthUser = { ...user, roles: ['pro_user'] };
    expect(() => controller.create(nonAdmin, { plan: 'business' })).toThrow(ForbiddenException);
    expect(subscriptions.create).not.toHaveBeenCalled();
  });

  it('GET plans is @Public', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SubscriptionsController.prototype.listPlans)).toBe(
      true
    );
  });

  it('GET plans returns the catalog from PlansService', async () => {
    const catalog = { items: [{ slug: 'pro', priceMonthly: 9.99, priceYearly: 99 }] };
    plans.findAll.mockResolvedValue(catalog);
    await expect(controller.listPlans()).resolves.toEqual(catalog);
    expect(plans.findAll).toHaveBeenCalled();
  });
});

describe('CheckoutDto validation', () => {
  it('accepts optional paymentMethod', async () => {
    const dto = Object.assign(new CheckoutDto(), { plan: 'pro', interval: 'year' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects invalid plan enum', async () => {
    const dto = Object.assign(new CheckoutDto(), { plan: 'gold', interval: 'month' });
    expect((await validate(dto)).some((e) => e.property === 'plan')).toBe(true);
  });

  it('rejects invalid interval enum', async () => {
    const dto = Object.assign(new CheckoutDto(), { plan: 'pro', interval: 'weekly' });
    expect((await validate(dto)).some((e) => e.property === 'interval')).toBe(true);
  });
});
