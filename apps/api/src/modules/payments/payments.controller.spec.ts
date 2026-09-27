import { Test } from '@nestjs/testing';
import { PATH_METADATA } from '@nestjs/common/constants';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { IS_PUBLIC_KEY, type AuthUser } from '../../common/decorators';

const user: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  subscriptionTier: 'free',
  roles: [],
};

describe('PaymentsController', () => {
  const payments = {
    history: jest.fn(),
    handleStripeWebhook: jest.fn(),
  };

  let controller: PaymentsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: payments }],
    }).compile();
    controller = module.get(PaymentsController);
  });

  it('GET /payments/history returns the signed-in user history', async () => {
    payments.history.mockResolvedValue({ items: [] });
    await expect(controller.history(user)).resolves.toEqual({ items: [] });
    expect(payments.history).toHaveBeenCalledWith('user-1');
  });

  it('exposes only history and the Stripe webhook (CinetPay removed)', () => {
    const routes = Object.getOwnPropertyNames(PaymentsController.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) =>
        Reflect.getMetadata(
          PATH_METADATA,
          (PaymentsController.prototype as unknown as Record<string, object>)[name]
        )
      );
    expect(routes.sort()).toEqual(['history', 'webhook']);
  });

  describe('POST /payments/webhook (Stripe)', () => {
    it('passes the raw body and signature to the Stripe handler', async () => {
      payments.handleStripeWebhook.mockResolvedValue({ received: true });
      const raw = Buffer.from('{"id":"evt_test"}');

      const result = await controller.webhook({ rawBody: raw, body: raw }, 'whsec_test');

      expect(result).toEqual({ received: true });
      expect(payments.handleStripeWebhook).toHaveBeenCalledWith(raw, 'whsec_test');
    });

    it('rejects a request without signature', () => {
      const raw = Buffer.from('{}');
      expect(() => controller.webhook({ rawBody: raw, body: raw }, '')).toThrow();
      expect(payments.handleStripeWebhook).not.toHaveBeenCalled();
    });

    it('remains @Public (Stripe servers have no JWT)', () => {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, PaymentsController.prototype.webhook)).toBe(true);
    });

    it('skips throttle so Stripe retries are not 429', () => {
      expect(
        Reflect.getMetadata('THROTTLER:SKIPdefault', PaymentsController.prototype.webhook)
      ).toBe(true);
    });
  });
});
