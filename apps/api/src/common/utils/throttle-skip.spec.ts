import type { ExecutionContext } from '@nestjs/common';
import { shouldSkipAuthThrottle } from './throttle-skip';

class AuthController {}
class PaymentsController {}

function ctxFor(controller: new () => unknown): ExecutionContext {
  return { getClass: () => controller } as unknown as ExecutionContext;
}

describe('shouldSkipAuthThrottle', () => {
  it('skips auth routes when AUTH_RATE_LIMIT_DISABLED=true outside production', () => {
    const env = { NODE_ENV: 'test', AUTH_RATE_LIMIT_DISABLED: 'true' };
    expect(shouldSkipAuthThrottle(ctxFor(AuthController), env)).toBe(true);
  });

  it('keeps throttling other controllers even when the flag is set', () => {
    const env = { NODE_ENV: 'test', AUTH_RATE_LIMIT_DISABLED: 'true' };
    expect(shouldSkipAuthThrottle(ctxFor(PaymentsController), env)).toBe(false);
  });

  it('keeps throttling auth routes when the flag is not set', () => {
    expect(shouldSkipAuthThrottle(ctxFor(AuthController), { NODE_ENV: 'test' })).toBe(false);
  });

  it('never skips in production, even with the flag set', () => {
    const env = { NODE_ENV: 'production', AUTH_RATE_LIMIT_DISABLED: 'true' };
    expect(shouldSkipAuthThrottle(ctxFor(AuthController), env)).toBe(false);
  });
});
