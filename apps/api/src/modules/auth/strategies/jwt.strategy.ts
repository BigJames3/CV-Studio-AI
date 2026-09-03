import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../../../common/decorators';
import { AuthSessionService } from '../auth-session.service';
import { getJwtAccessSecret } from '../auth-secrets';

type JwtPayload = {
  sub: string;
  email: string;
  subscriptionTier: 'free' | 'pro' | 'business';
  roles: string[];
  sid?: string;
  fid?: string;
  tv?: number;
  typ?: string;
  temp?: boolean;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly sessions: AuthSessionService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtAccessSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.typ === 'pre_2fa' || payload.temp) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Temporary token cannot access protected routes',
      });
    }
    if (payload.typ && payload.typ !== 'access') {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid token type',
      });
    }
    if (!payload.sid || payload.tv === undefined) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token is not bound to a session',
      });
    }

    await this.sessions.assertAccessToken(payload.sid, payload.tv, payload.sub);

    return {
      id: payload.sub,
      email: payload.email,
      subscriptionTier: payload.subscriptionTier,
      roles: payload.roles ?? [],
      sessionId: payload.sid,
    };
  }
}
