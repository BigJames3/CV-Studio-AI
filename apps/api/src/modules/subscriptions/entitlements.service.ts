import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';

/**
 * Server-side feature gates. Redis cache recommended in production.
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTier(userId: string): Promise<'free' | 'pro' | 'business'> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    return (user?.subscriptionTier as 'free' | 'pro' | 'business') ?? 'free';
  }

  async can(userId: string, feature: string): Promise<boolean> {
    const tier = await this.getTier(userId);

    if (feature === 'cv:create') {
      if (tier !== 'free') return true;
      const count = await this.prisma.cv.count({
        where: { userId, deletedAt: null },
      });
      return count < 1;
    }

    const matrix: Record<string, Array<'free' | 'pro' | 'business'>> = {
      'cv:export:pdf': ['free', 'pro', 'business'],
      // Étape 13: DOCX generator not ready — entitlement hidden until real export ships
      'cv:export:docx': [],
      'ai:generate': ['pro', 'business'],
      'ai:optimize': ['pro', 'business'],
      'ai:cover_letter': ['pro', 'business'],
      'ai:ats': ['free', 'pro', 'business'], // Free = teaser allowed
      'ai:interview': ['pro', 'business'],
      'marketplace:buy': ['pro', 'business'],
      'api:access': ['business'],
    };

    const allowed = matrix[feature];
    if (!allowed) return false;
    return allowed.includes(tier);
  }
}
