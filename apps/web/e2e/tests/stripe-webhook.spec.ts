import { test, expect } from '../fixtures/auth.fixture';

/**
 * Webhook retry / DLQ / Redis NX lock are not browser flows.
 * They live in Jest: apps/api/src/modules/payments/payments.service.spec.ts
 * (P0-1 lock, retry then success, DLQ + Sentry).
 *
 * This spec documents the contract and fails CI if the unit file disappears.
 */
test.describe('Webhook P0 contract @webhook', () => {
  test('documents Jest coverage for lock, retry, DLQ', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const spec = path.resolve(
      __dirname,
      '../../../api/src/modules/payments/payments.service.spec.ts'
    );
    const src = await fs.readFile(spec, 'utf8');
    expect(src).toMatch(/P0-1: Lock Processing/);
    expect(src).toMatch(/retries on transient error then succeeds/);
    expect(src).toMatch(/sends to DLQ and alerts on permanent error/);
    expect(src).toMatch(/prevent double processing/);
  });
});
