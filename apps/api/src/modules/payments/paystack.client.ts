import { createHmac, timingSafeEqual } from 'crypto';

/*
 * Minimal Paystack REST client (https://paystack.com/docs/api). No SDK: Paystack has no
 * official Node one, and the few endpoints used here are plain JSON over HTTPS.
 * Amounts are always in the currency's subunit (amount × 100, XOF included).
 */

const DEFAULT_API_URL = 'https://api.paystack.co';
const REQUEST_TIMEOUT_MS = 15_000;

export class PaystackApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when Paystack could not be reached. */
    readonly status: number
  ) {
    super(message);
    this.name = 'PaystackApiError';
  }

  /** Paystack answered and refused (4xx): retrying the same call cannot help. */
  get isDefinitive(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export type PaystackMetadata = Record<string, string | number | boolean | null | undefined>;

export type PaystackTransaction = {
  id: number;
  /** success | failed | abandoned | ongoing | pending | processing | queued | reversed */
  status: string;
  reference: string;
  /** Subunit (× 100). */
  amount: number;
  currency: string;
  channel?: string | null;
  paid_at?: string | null;
  paidAt?: string | null;
  fees?: number | null;
  gateway_response?: string | null;
  /** Echo of what initialize received; Paystack may return it as a JSON string. */
  metadata?: PaystackMetadata | string | null;
  customer?: { email?: string | null; customer_code?: string | null } | null;
  subaccount?: { subaccount_code?: string | null } | Record<string, never> | null;
};

export type InitializeTransactionParams = {
  email: string;
  /** Subunit (× 100). */
  amount: number;
  currency: string;
  reference: string;
  callback_url: string;
  metadata: PaystackMetadata;
  /** Split: the subaccount receives `amount - transaction_charge`. */
  subaccount?: string;
  transaction_charge?: number;
  bearer?: 'account' | 'subaccount';
};

export type PaystackBank = {
  name: string;
  code: string;
  type?: string | null;
  currency?: string | null;
  active?: boolean;
};

export type PaystackSubaccount = {
  subaccount_code: string;
  business_name?: string;
  settlement_bank?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  is_verified?: boolean;
  active?: boolean;
};

type Envelope<T> = { status: boolean; message: string; data: T };

export class PaystackClient {
  private readonly baseUrl: string;

  constructor(
    private readonly secretKey: string,
    baseUrl = process.env.PAYSTACK_API_URL
  ) {
    this.baseUrl = (baseUrl?.trim() || DEFAULT_API_URL).replace(/\/$/, '');
  }

  initializeTransaction(params: InitializeTransactionParams) {
    return this.request<{ authorization_url: string; access_code: string; reference: string }>(
      'POST',
      '/transaction/initialize',
      params
    );
  }

  /** The transaction as Paystack has it: the only proof a payment happened. */
  verifyTransaction(reference: string) {
    return this.request<PaystackTransaction>(
      'GET',
      `/transaction/verify/${encodeURIComponent(reference)}`
    );
  }

  listBanks(currency: string) {
    const query = new URLSearchParams({ currency, perPage: '100' });
    return this.request<PaystackBank[]>('GET', `/bank?${query.toString()}`);
  }

  createSubaccount(params: {
    business_name: string;
    settlement_bank: string;
    account_number: string;
    percentage_charge: number;
    primary_contact_email?: string;
    metadata?: string;
  }) {
    return this.request<PaystackSubaccount>('POST', '/subaccount', params);
  }

  updateSubaccount(
    code: string,
    params: { business_name?: string; settlement_bank: string; account_number: string }
  ) {
    return this.request<PaystackSubaccount>(
      'PUT',
      `/subaccount/${encodeURIComponent(code)}`,
      params
    );
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new PaystackApiError(
        `Paystack unreachable: ${error instanceof Error ? error.message : String(error)}`,
        0
      );
    }

    let payload: Partial<Envelope<T>> | null = null;
    try {
      payload = (await response.json()) as Partial<Envelope<T>>;
    } catch {
      payload = null;
    }
    if (!response.ok || !payload?.status) {
      throw new PaystackApiError(
        payload?.message || `Paystack ${method} ${path} failed (${response.status})`,
        response.ok ? 502 : response.status
      );
    }
    return payload.data as T;
  }
}

/**
 * Paystack signs every webhook with HMAC-SHA512 of the raw body, keyed with the secret key,
 * in the `x-paystack-signature` header (hex).
 */
export function isValidPaystackSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secretKey: string
): boolean {
  if (!signature || !/^[0-9a-f]+$/i.test(signature)) return false;
  const expected = createHmac('sha512', secretKey).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Metadata as sent to initialize, whether Paystack returns it as an object or a string. */
export function transactionMetadata(tx: Pick<PaystackTransaction, 'metadata'>): PaystackMetadata {
  const raw = tx.metadata;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as PaystackMetadata) : {};
    } catch {
      return {};
    }
  }
  return raw;
}

export function metadataString(metadata: PaystackMetadata, key: string): string | undefined {
  const value = metadata[key];
  return value === undefined || value === null ? undefined : String(value);
}

/** When Paystack recorded the payment; now if it says nothing. */
export function transactionPaidAt(tx: Pick<PaystackTransaction, 'paid_at' | 'paidAt'>): Date {
  const raw = tx.paid_at ?? tx.paidAt;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
