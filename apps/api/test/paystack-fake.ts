import { INestApplication } from '@nestjs/common';
import { PaystackService } from '../src/modules/payments/paystack.service';
import type { PaystackClient } from '../src/modules/payments/paystack.client';

export const FAKE_PAYSTACK_SECRET = 'sk_test_e2e_fake_paystack_secret';

/**
 * Points the app's PaystackService at an in-memory fake (no network) and gives it a secret, so
 * webhooks signed with FAKE_PAYSTACK_SECRET verify. The app is one module graph: every service
 * that injects PaystackService sees the fake.
 */
export function installFakePaystack(app: INestApplication, client: Partial<PaystackClient>) {
  const service = app.get(PaystackService) as unknown as {
    client: Partial<PaystackClient>;
    secretKey: string;
  };
  service.client = client;
  service.secretKey = FAKE_PAYSTACK_SECRET;
}
