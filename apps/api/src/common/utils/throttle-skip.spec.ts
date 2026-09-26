import type { ExecutionContext } from '@nestjs/common';
import { shouldSkipThrottle } from './throttle-skip';

class AuthController {}
class PaymentsController {}

function ctxFor(controller: new () => unknown): ExecutionContext {
  return { getClass: () => controller } as unknown as ExecutionContext;
}

describe('shouldSkipThrottle', () => {
  it('skips auth routes when AUTH_RATE_LIMIT_DISABLED=true outside production', () => {
    const env = { NODE_ENV: 'test', AUTH_RATE_LIMIT_DISABLED: 'true' };
    expect(shouldSkipThrottle(ctxFor(AuthController), env)).toBe(true);
  });

  it('keeps throttling other controllers even when the flag is set', () => {
    const env = { NODE_ENV: 'test', AUTH_RATE_LIMIT_DISABLED: 'true' };
    expect(shouldSkipThrottle(ctxFor(PaymentsController), env)).toBe(false);
  });

  it('keeps throttling auth routes when the flag is not set', () => {
    expect(shouldSkipThrottle(ctxFor(AuthController), { NODE_ENV: 'test' })).toBe(false);
  });

  it('never skips in production, even with the flag set', () => {
    const env = { NODE_ENV: 'production', AUTH_RATE_LIMIT_DISABLED: 'true' };
    expect(shouldSkipThrottle(ctxFor(AuthController), env)).toBe(false);
  });

  it('skips every controller when THROTTLE_DISABLED=true outside production', () => {
    const env = { NODE_ENV: 'test', THROTTLE_DISABLED: 'true' };
    expect(shouldSkipThrottle(ctxFor(PaymentsController), env)).toBe(true);
    expect(shouldSkipThrottle(ctxFor(AuthController), env)).toBe(true);
  });

  it('ignores THROTTLE_DISABLED in production', () => {
    const env = { NODE_ENV: 'production', THROTTLE_DISABLED: 'true' };
    expect(shouldSkipThrottle(ctxFor(PaymentsController), env)).toBe(false);
  });
});
