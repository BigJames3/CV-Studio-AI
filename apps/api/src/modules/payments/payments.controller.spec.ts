import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CinetpayGateway } from './gateways/cinetpay.gateway';
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
    getStatus: jest.fn(),
    handleStripeWebhook: jest.fn(),
    availableMethods: jest.fn(),
  };
  const cinetpayGateway = {
    handleCinetpayNotify: jest.fn(),
    getPaymentStatus: jest.fn(),
  };

  let controller: PaymentsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: payments },
        { provide: CinetpayGateway, useValue: cinetpayGateway },
      ],
    }).compile();
    controller = module.get(PaymentsController);
  });

  describe('POST /payments/webhook/cinetpay', () => {
    it('accepts a CinetPay notify body and always returns 200 payload', async () => {
      cinetpayGateway.handleCinetpayNotify.mockResolvedValue({ received: true });

      const result = await controller.cinetpayWebhook({
        body: { cpm_trans_id: 'cv_abc_1', cpm_status: 'ACCEPTED' },
        method: 'POST',
      });

      expect(result).toEqual({ received: true });
      expect(cinetpayGateway.handleCinetpayNotify).toHaveBeenCalledWith(
        { cpm_trans_id: 'cv_abc_1', cpm_status: 'ACCEPTED' },
        'POST'
      );
    });

    it('returns received=true even if the gateway throws (idempotent)', async () => {
      cinetpayGateway.handleCinetpayNotify.mockRejectedValue(new Error('boom'));

      await expect(
        controller.cinetpayWebhook({
          body: { cpm_trans_id: 'cv_abc_1' },
          method: 'POST',
        })
      ).resolves.toEqual({ received: true });
    });

    it('logs the transaction id', async () => {
      cinetpayGateway.handleCinetpayNotify.mockResolvedValue({ received: true });
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

      await controller.cinetpayWebhook({
        body: { cpm_trans_id: 'cv_log_99' },
        method: 'POST',
      });

      expect(log).toHaveBeenCalledWith(expect.stringContaining('cv_log_99'));
      log.mockRestore();
    });

    it('GET ping is public and returns 200 payload', async () => {
      cinetpayGateway.handleCinetpayNotify.mockResolvedValue({ received: true });
      await expect(controller.cinetpayWebhookPing()).resolves.toEqual({ received: true });
      expect(cinetpayGateway.handleCinetpayNotify).toHaveBeenCalledWith({}, 'GET');
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, PaymentsController.prototype.cinetpayWebhookPing)
      ).toBe(true);
    });
  });

  describe('GET /payments/methods', () => {
    it('returns configured providers', async () => {
      payments.availableMethods.mockReturnValue({
        stripe: true,
        cinetpay: false,
        cinetpayFailClosed: true,
      });
      expect(controller.paymentMethods()).toEqual({
        stripe: true,
        cinetpay: false,
        cinetpayFailClosed: true,
      });
    });
  });

  describe('POST /payments/webhook (Stripe — regression)', () => {
    it('stays on the Stripe handler and never calls CinetPay', async () => {
      payments.handleStripeWebhook.mockResolvedValue({ received: true });
      const raw = Buffer.from('{"id":"evt_test"}');

      const result = await controller.webhook({ rawBody: raw, body: raw }, 'whsec_test');

      expect(result).toEqual({ received: true });
      expect(payments.handleStripeWebhook).toHaveBeenCalledWith(raw, 'whsec_test');
      expect(cinetpayGateway.handleCinetpayNotify).not.toHaveBeenCalled();
    });

    it('remains @Public (Stripe servers have no JWT)', () => {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, PaymentsController.prototype.webhook)).toBe(true);
    });
  });

  describe('GET /payments/status/:transactionId', () => {
    it('returns status, paymentMethod, and transactionId', async () => {
      payments.getStatus.mockResolvedValue({
        status: 'pending',
        paymentMethod: 'cinetpay',
        transactionId: 'cv_abc_1',
      });

      await expect(controller.getPaymentStatus(user, 'cv_abc_1')).resolves.toEqual({
        status: 'pending',
        paymentMethod: 'cinetpay',
        transactionId: 'cv_abc_1',
      });
      expect(payments.getStatus).toHaveBeenCalledWith('user-1', 'cv_abc_1');
    });

    it('returns not_found for an unknown transaction', async () => {
      payments.getStatus.mockResolvedValue({ status: 'not_found', transactionId: 'missing' });

      await expect(controller.getPaymentStatus(user, 'missing')).resolves.toEqual({
        status: 'not_found',
        transactionId: 'missing',
      });
    });

    it('requires auth so polling stays scoped to the signed-in user', () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, PaymentsController.prototype.getPaymentStatus)
      ).toBeFalsy();
    });
  });
});
