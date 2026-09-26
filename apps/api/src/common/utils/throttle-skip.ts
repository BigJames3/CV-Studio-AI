import type { ExecutionContext } from '@nestjs/common';

/**
 * Lets E2E runs bypass the Nest throttler. Never honoured in production.
 * - AUTH_RATE_LIMIT_DISABLED=true skips auth routes, mirroring AuthRateLimitService.
 * - THROTTLE_DISABLED=true skips every route: all E2E traffic comes from one IP
 *   and exceeds the per-route global limit.
 */
export function shouldSkipThrottle(
  context: ExecutionContext,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.NODE_ENV === 'production') return false;
  if (env.THROTTLE_DISABLED === 'true') return true;
  if (env.AUTH_RATE_LIMIT_DISABLED !== 'true') return false;
  return context.getClass().name === 'AuthController';
}
