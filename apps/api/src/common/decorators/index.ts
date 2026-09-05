import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const ENTITLEMENT_KEY = 'entitlement';
export const RequireEntitlement = (feature: string) => SetMetadata(ENTITLEMENT_KEY, feature);

export const FEATURE_GATE_KEY = 'featureGate';
export type GatedFeature =
  'downloadPDF' | 'print' | 'share' | 'proTemplates' | 'businessTemplates' | 'advancedFeatures';
export const RequireFeature = (feature: GatedFeature) => SetMetadata(FEATURE_GATE_KEY, feature);

export type AuthUser = {
  id: string;
  email: string;
  subscriptionTier: 'free' | 'pro' | 'business';
  roles: string[];
  sessionId?: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

export const IDEMPOTENCY_KEY = 'idempotency';
export const Idempotent = () => SetMetadata(IDEMPOTENCY_KEY, true);
