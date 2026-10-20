import { createHmac } from 'crypto';
import {
  PaystackApiError,
  PaystackClient,
  isValidPaystackSignature,
  metadataString,
  transactionMetadata,
  transactionPaidAt,
} from './paystack.client';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('PaystackClient', () => {
  const fetchMock = jest.fn();
  const client = new PaystackClient('sk_test_key', 'https://paystack.test/');

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as never;
  });

  it('sends authenticated JSON requests and unwraps data', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        status: true,
        message: 'ok',
        data: { authorization_url: 'https://checkout.paystack.com/x', reference: 'r1' },
      })
    );
    const params = {
      email: 'a@example.com',
      amount: 500_000,
      currency: 'XOF',
      reference: 'r1',
      callback_url: 'https://app.test/account/billing',
      metadata: { type: 'subscription' },
    };
    await expect(client.initializeTransaction(params)).resolves.toMatchObject({
      authorization_url: 'https://checkout.paystack.com/x',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://paystack.test/transaction/initialize');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer sk_test_key');
    expect(JSON.parse(init.body)).toEqual(params);
  });

  it('encodes path and query parameters', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: true, message: 'ok', data: [] }));
    await client.verifyTransaction('a/b');
    await client.listBanks('XOF');
    await client.updateSubaccount('ACCT_1', { settlement_bank: '1', account_number: '0123456' });
    await client.createSubaccount({
      business_name: 'Shop',
      settlement_bank: '1',
      account_number: '0123456',
      percentage_charge: 30,
    });
    expect(fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      'GET https://paystack.test/transaction/verify/a%2Fb',
      'GET https://paystack.test/bank?currency=XOF&perPage=100',
      'PUT https://paystack.test/subaccount/ACCT_1',
      'POST https://paystack.test/subaccount',
    ]);
  });

  it('turns refusals, bad bodies and network errors into PaystackApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { status: false, message: 'Transaction reference not found' })
    );
    const notFound = await client.verifyTransaction('r').catch((e: unknown) => e);
    expect(notFound).toBeInstanceOf(PaystackApiError);
    expect(notFound).toMatchObject({ status: 404, message: 'Transaction reference not found' });
    expect((notFound as PaystackApiError).isDefinitive).toBe(true);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('html');
      },
    } as unknown as Response);
    await expect(client.verifyTransaction('r')).rejects.toMatchObject({ status: 502 });

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: false, message: 'nope' }));
    await expect(client.verifyTransaction('r')).rejects.toMatchObject({ status: 502 });

    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    const unreachable = await client.verifyTransaction('r').catch((e: unknown) => e);
    expect(unreachable).toMatchObject({ status: 0 });
    expect((unreachable as PaystackApiError).isDefinitive).toBe(false);
  });
});

describe('isValidPaystackSignature', () => {
  const body = Buffer.from('{"event":"charge.success"}');
  const valid = createHmac('sha512', 'sk_test_key').update(body).digest('hex');

  it('accepts the HMAC-SHA512 of the raw body', () => {
    expect(isValidPaystackSignature(body, valid, 'sk_test_key')).toBe(true);
    expect(isValidPaystackSignature(body, valid.toUpperCase(), 'sk_test_key')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidPaystackSignature(body, valid, 'sk_test_other')).toBe(false);
    expect(isValidPaystackSignature(Buffer.from('{}'), valid, 'sk_test_key')).toBe(false);
    expect(isValidPaystackSignature(body, valid.slice(2), 'sk_test_key')).toBe(false);
    expect(isValidPaystackSignature(body, 'zz', 'sk_test_key')).toBe(false);
    expect(isValidPaystackSignature(body, undefined, 'sk_test_key')).toBe(false);
  });
});

describe('transaction helpers', () => {
  it('reads metadata as an object or a JSON string', () => {
    expect(transactionMetadata({ metadata: { a: 1 } })).toEqual({ a: 1 });
    expect(transactionMetadata({ metadata: '{"a":2}' })).toEqual({ a: 2 });
    expect(transactionMetadata({ metadata: 'oops' })).toEqual({});
    expect(transactionMetadata({ metadata: '3' })).toEqual({});
    expect(transactionMetadata({ metadata: null })).toEqual({});
    expect(metadataString({ a: 1, b: null }, 'a')).toBe('1');
    expect(metadataString({ a: 1, b: null }, 'b')).toBeUndefined();
  });

  it('reads the payment date, defaulting to now', () => {
    expect(transactionPaidAt({ paid_at: '2026-10-20T10:00:00Z' })).toEqual(
      new Date('2026-10-20T10:00:00Z')
    );
    expect(transactionPaidAt({ paidAt: '2026-10-21T10:00:00Z' })).toEqual(
      new Date('2026-10-21T10:00:00Z')
    );
    const before = Date.now();
    expect(transactionPaidAt({ paid_at: 'garbage' }).getTime()).toBeGreaterThanOrEqual(before);
    expect(transactionPaidAt({}).getTime()).toBeGreaterThanOrEqual(before);
  });
});
