import { Test } from '@nestjs/testing';
import { validate } from 'class-validator';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
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

  let controller: SubscriptionsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [{ provide: SubscriptionsService, useValue: subscriptions }],
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
