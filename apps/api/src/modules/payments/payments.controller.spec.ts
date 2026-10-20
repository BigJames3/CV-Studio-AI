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
    handlePaystackWebhook: jest.fn(),
    confirmCheckout: jest.fn(),
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

  it('POST /payments/checkout/confirm confirms the payment for the signed-in user', async () => {
    payments.confirmCheckout.mockResolvedValue({ confirmed: true });
    await expect(controller.confirmCheckout(user, { reference: 'sub_ref_1' })).resolves.toEqual({
      confirmed: true,
    });
    expect(payments.confirmCheckout).toHaveBeenCalledWith('user-1', 'sub_ref_1');
  });

  it('exposes only history, checkout confirmation and the Paystack webhook', () => {
    const routes = Object.getOwnPropertyNames(PaymentsController.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) =>
        Reflect.getMetadata(
          PATH_METADATA,
          (PaymentsController.prototype as unknown as Record<string, object>)[name]
        )
      );
    expect(routes.sort()).toEqual(['checkout/confirm', 'history', 'webhook']);
  });

  describe('POST /payments/webhook (Paystack)', () => {
    it('passes the raw body and signature to the Paystack handler', async () => {
      payments.handlePaystackWebhook.mockResolvedValue({ received: true });
      const raw = Buffer.from('{"event":"charge.success"}');

      const result = await controller.webhook({ rawBody: raw, body: raw }, 'a1b2c3');

      expect(result).toEqual({ received: true });
      expect(payments.handlePaystackWebhook).toHaveBeenCalledWith(raw, 'a1b2c3');
    });

    it('rejects a request without signature', () => {
      const raw = Buffer.from('{}');
      expect(() => controller.webhook({ rawBody: raw, body: raw }, '')).toThrow();
      expect(payments.handlePaystackWebhook).not.toHaveBeenCalled();
    });

    it('remains @Public (Paystack servers have no JWT)', () => {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, PaymentsController.prototype.webhook)).toBe(true);
    });

    it('skips throttle so Paystack retries are not 429', () => {
      expect(
        Reflect.getMetadata('THROTTLER:SKIPdefault', PaymentsController.prototype.webhook)
      ).toBe(true);
    });
  });
});
