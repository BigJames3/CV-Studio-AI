import type { ExecutionContext } from '@nestjs/common';

/**
 * Lets E2E runs bypass the Nest throttler on auth routes, mirroring
 * AuthRateLimitService. Never honoured in production.
 */
export function shouldSkipAuthThrottle(
  context: ExecutionContext,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.NODE_ENV === 'production') return false;
  if (env.AUTH_RATE_LIMIT_DISABLED !== 'true') return false;
  return context.getClass().name === 'AuthController';
}
