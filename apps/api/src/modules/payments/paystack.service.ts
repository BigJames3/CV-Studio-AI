import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PaystackClient } from './paystack.client';
import { paystackSecretForClient } from './payment-env';

/** The Paystack client of this environment, or a fail-closed error when none is configured. */
@Injectable()
export class PaystackService {
  private readonly client: PaystackClient | null;
  readonly secretKey: string | null;

  constructor() {
    this.secretKey = paystackSecretForClient();
    this.client = this.secretKey ? new PaystackClient(this.secretKey) : null;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  require(): PaystackClient {
    if (!this.client) {
      throw new ServiceUnavailableException({
        code: 'PAYMENTS_NOT_CONFIGURED',
        message: 'Payments are not configured (fail-closed).',
      });
    }
    return this.client;
  }
}
