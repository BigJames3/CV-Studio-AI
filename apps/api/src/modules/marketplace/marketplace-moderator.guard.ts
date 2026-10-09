import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/decorators';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marketplace moderators: user ids listed in MARKETPLACE_MODERATOR_IDS (comma separated).
 * Deliberately independent of the plan (JWT roles are derived from subscriptionTier) and
 * closed by default: an empty or missing list lets nobody in.
 */
export function moderatorIds(env: NodeJS.ProcessEnv = process.env): Set<string> {
  return new Set(
    (env.MARKETPLACE_MODERATOR_IDS ?? '')
      .split(',')
      .map((id) => id.trim().toLowerCase())
      .filter((id) => UUID.test(id))
  );
}

export function isMarketplaceModerator(userId: string | undefined, env = process.env): boolean {
  return Boolean(userId) && moderatorIds(env).has(String(userId).toLowerCase());
}

@Injectable()
export class MarketplaceModeratorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!isMarketplaceModerator(user?.id)) {
      throw new ForbiddenException({
        code: 'MODERATOR_REQUIRED',
        message: 'Marketplace moderators only',
      });
    }
    return true;
  }
}
