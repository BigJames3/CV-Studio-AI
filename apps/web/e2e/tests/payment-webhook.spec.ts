import { test, expect } from '../fixtures/auth.fixture';

/**
 * Paystack webhook idempotency / Redis NX lock / retry / DLQ are not browser flows.
 * They live in Jest: apps/api/src/modules/payments/payments.service.spec.ts
 * (processEventWithRetry).
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
    expect(src).toMatch(/describe\('processEventWithRetry'/);
    expect(src).toMatch(/skips an event already processed/);
    expect(src).toMatch(/skips an event another pod is processing/);
    expect(src).toMatch(/retries, then sends the event to the DLQ and alerts/);
  });
});
