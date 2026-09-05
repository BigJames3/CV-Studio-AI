import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ENTITLEMENT_KEY } from '../decorators';
import { EntitlementsService } from '../../modules/subscriptions/entitlements.service';

@Injectable()
export class EntitlementsGuard implements CanActivate {
  private readonly logger = new Logger(EntitlementsGuard.name);

  constructor(
    private reflector: Reflector,
    private entitlements: EntitlementsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string>(ENTITLEMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!feature) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string } | undefined;
    if (!user?.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'No user' });
    }

    const allowed = await this.entitlements.can(user.id, feature);
    if (!allowed) {
      this.logger.warn(`Feature denied: user=${user.id}, feature=${feature}`);
      throw new ForbiddenException({
        statusCode: 402,
        code: 'ENTITLEMENT_REQUIRED',
        message: `Feature requires upgrade: ${feature}`,
        details: { feature, upgradeUrl: '/pricing' },
      });
    }
    return true;
  }
}
